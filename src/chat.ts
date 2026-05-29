import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { applyEdits, parseEdits } from "./edits";
import {
  DiffScope,
  describeScope,
  getChangedFiles,
  getFileDiff,
  isGitRepo,
  parseScope,
} from "./git";
import { clamp } from "./input";
import { completePrompt } from "./backend";
import { ClaudeCodeError } from "./claudeCode";
import { DEFAULT_PERSONA_KEY, resolvePersona } from "./personas";
import { buildReviewPrompt, buildSecurityPrompt } from "./prompts";

const PARTICIPANT_ID = "aiReview.chat";
const APPLY_COMMAND = "aiReview.applyFileEdits";
const CANCEL_COMMAND = "aiReview.cancelRun";

// The active run, so an in-stream "Stop" button can cancel it even when the
// chat host does not render its own Stop control.
let activeRun: vscode.CancellationTokenSource | undefined;

const SKIP =
  /(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml|\.min\.(?:js|css)|\.(?:png|jpe?g|gif|svg|ico|pdf|lock|map))$/i;

interface ApplyArgs {
  fsPath: string;
  content: string;
}

export function registerChat(context: vscode.ExtensionContext): void {
  const participant = vscode.chat.createChatParticipant(PARTICIPANT_ID, handler);
  participant.iconPath = new vscode.ThemeIcon("checklist");
  context.subscriptions.push(
    participant,
    vscode.commands.registerCommand(APPLY_COMMAND, applyFileEdits),
    vscode.commands.registerCommand(CANCEL_COMMAND, () => activeRun?.cancel()),
  );
}

const handler: vscode.ChatRequestHandler = async (request, _context, stream, token) => {
  const security = request.command === "security";
  const build = security ? buildSecurityPrompt : buildReviewPrompt;
  const label = security ? "Security check" : "Code review";

  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) {
    stream.markdown("Open a folder before running a review.");
    return {};
  }
  if (!(await isGitRepo(root))) {
    stream.markdown("The current workspace is not a git repository.");
    return {};
  }

  const scope = parseScope(request.prompt);
  const persona = resolvePersona(
    vscode.workspace
      .getConfiguration("aiReview")
      .get<string>("reviewPersona", DEFAULT_PERSONA_KEY),
  );

  activeRun?.cancel();
  const cts = new vscode.CancellationTokenSource();
  activeRun = cts;
  const runToken = cts.token;
  const hostCancel = token.onCancellationRequested(() => cts.cancel());

  try {
    stream.markdown(`**${label}** — ${describeScope(scope)}\n`);
    stream.button({ command: CANCEL_COMMAND, title: "Stop review" });
    stream.progress("Finding changed files…");

    let files: string[];
    try {
      files = (await getChangedFiles(root, scope)).filter((f) => !SKIP.test(f));
    } catch (err) {
      stream.markdown(`\n\ngit diff failed: ${errorMessage(err)}`);
      return {};
    }
    if (files.length === 0) {
      stream.markdown("\n\nNo changed files for that scope.");
      return {};
    }

    let totalFixes = 0;
    for (const file of files) {
      if (runToken.isCancellationRequested) {
        break;
      }
      const abs = path.join(root, file);
      let content: string;
      try {
        content = await fs.readFile(abs, "utf8");
      } catch {
        continue; // deleted or binary
      }

      const diff = await safeFileDiff(root, scope, file);
      const clamped = clamp(content);
      stream.progress(`Reviewing ${file}…`);

      let raw: string;
      try {
        raw = await completePrompt(
          build(persona, file, clamped.text, diff, clamped.truncated),
          runToken,
          { model: request.model },
        );
      } catch (err) {
        if (runToken.isCancellationRequested || err instanceof vscode.CancellationError) {
          break;
        }
        stream.markdown(`\n\n_Error on ${file}: ${errorMessage(err)}_`);
        if (err instanceof ClaudeCodeError) {
          break; // backend unavailable — stop the whole run
        }
        continue;
      }
      if (runToken.isCancellationRequested) {
        break;
      }

      const edits = parseEdits(raw);
      if (edits.length === 0) {
        continue;
      }
      const { result, applied } = applyEdits(content, edits);
      if (applied.length === 0) {
        continue;
      }
      totalFixes += applied.length;

      stream.markdown(`\n\n### ${file}\n`);
      for (const edit of applied) {
        const why = edit.explanation.length > 0 ? ` — ${edit.explanation}` : "";
        stream.markdown(`- **${edit.severity} · ${edit.category}**${why}\n`);
      }
      stream.button({
        command: APPLY_COMMAND,
        title: `Apply ${applied.length} fix(es) to ${path.basename(file)}`,
        arguments: [{ fsPath: abs, content: result } satisfies ApplyArgs],
      });
    }

    if (runToken.isCancellationRequested) {
      const tail =
        totalFixes > 0
          ? ` ${totalFixes} fix(es) found before stopping — buttons above still work.`
          : "";
      stream.markdown(`\n\n---\n_Cancelled._${tail}`);
      return {};
    }
    if (totalFixes === 0) {
      stream.markdown("\n\nNo issues found.");
    } else {
      stream.markdown(
        `\n\n---\n${totalFixes} proposed fix(es). Click a button to apply — the change lands in the editor unsaved so you can review or undo it.`,
      );
    }
    return {};
  } finally {
    hostCancel.dispose();
    if (activeRun === cts) {
      activeRun = undefined;
    }
    cts.dispose();
  }
};

async function applyFileEdits(args: ApplyArgs): Promise<void> {
  const uri = vscode.Uri.file(args.fsPath);
  const doc = await vscode.workspace.openTextDocument(uri);
  const fullRange = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length),
  );
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, fullRange, args.content);
  const ok = await vscode.workspace.applyEdit(edit);
  if (ok) {
    await vscode.window.showTextDocument(doc);
    vscode.window.showInformationMessage(
      `Applied fixes to ${path.basename(args.fsPath)} — review and save.`,
    );
  } else {
    vscode.window.showErrorMessage(
      `Could not apply fixes to ${path.basename(args.fsPath)}.`,
    );
  }
}

async function safeFileDiff(
  root: string,
  scope: DiffScope,
  file: string,
): Promise<string> {
  try {
    return await getFileDiff(root, scope, file);
  } catch {
    return "";
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
