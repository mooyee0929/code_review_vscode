"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerChat = registerChat;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const vscode = __importStar(require("vscode"));
const edits_1 = require("./edits");
const git_1 = require("./git");
const input_1 = require("./input");
const backend_1 = require("./backend");
const claudeCode_1 = require("./claudeCode");
const personas_1 = require("./personas");
const prompts_1 = require("./prompts");
const PARTICIPANT_ID = "aiReview.chat";
const APPLY_COMMAND = "aiReview.applyFileEdits";
const CANCEL_COMMAND = "aiReview.cancelRun";
// The active run, so an in-stream "Stop" button can cancel it even when the
// chat host does not render its own Stop control.
let activeRun;
const SKIP = /(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml|\.min\.(?:js|css)|\.(?:png|jpe?g|gif|svg|ico|pdf|lock|map))$/i;
function registerChat(context) {
    const participant = vscode.chat.createChatParticipant(PARTICIPANT_ID, handler);
    participant.iconPath = new vscode.ThemeIcon("checklist");
    context.subscriptions.push(participant, vscode.commands.registerCommand(APPLY_COMMAND, applyFileEdits), vscode.commands.registerCommand(CANCEL_COMMAND, () => activeRun?.cancel()));
}
const handler = async (request, _context, stream, token) => {
    const security = request.command === "security";
    const build = security ? prompts_1.buildSecurityPrompt : prompts_1.buildReviewPrompt;
    const label = security ? "Security check" : "Code review";
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
        stream.markdown("Open a folder before running a review.");
        return {};
    }
    if (!(await (0, git_1.isGitRepo)(root))) {
        stream.markdown("The current workspace is not a git repository.");
        return {};
    }
    const scope = (0, git_1.parseScope)(request.prompt);
    const persona = (0, personas_1.resolvePersona)(vscode.workspace
        .getConfiguration("aiReview")
        .get("reviewPersona", personas_1.DEFAULT_PERSONA_KEY));
    activeRun?.cancel();
    const cts = new vscode.CancellationTokenSource();
    activeRun = cts;
    const runToken = cts.token;
    const hostCancel = token.onCancellationRequested(() => cts.cancel());
    try {
        stream.markdown(`**${label}** — ${(0, git_1.describeScope)(scope)}\n`);
        stream.button({ command: CANCEL_COMMAND, title: "Stop review" });
        stream.progress("Finding changed files…");
        let files;
        try {
            files = (await (0, git_1.getChangedFiles)(root, scope)).filter((f) => !SKIP.test(f));
        }
        catch (err) {
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
            let content;
            try {
                content = await fs.readFile(abs, "utf8");
            }
            catch {
                continue; // deleted or binary
            }
            const diff = await safeFileDiff(root, scope, file);
            const clamped = (0, input_1.clamp)(content);
            stream.progress(`Reviewing ${file}…`);
            let raw;
            try {
                raw = await (0, backend_1.completePrompt)(build(persona, file, clamped.text, diff, clamped.truncated), runToken, { model: request.model });
            }
            catch (err) {
                if (runToken.isCancellationRequested || err instanceof vscode.CancellationError) {
                    break;
                }
                stream.markdown(`\n\n_Error on ${file}: ${errorMessage(err)}_`);
                if (err instanceof claudeCode_1.ClaudeCodeError) {
                    break; // backend unavailable — stop the whole run
                }
                continue;
            }
            if (runToken.isCancellationRequested) {
                break;
            }
            const edits = (0, edits_1.parseEdits)(raw);
            if (edits.length === 0) {
                continue;
            }
            const { result, applied } = (0, edits_1.applyEdits)(content, edits);
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
                arguments: [{ fsPath: abs, content: result }],
            });
        }
        if (runToken.isCancellationRequested) {
            const tail = totalFixes > 0
                ? ` ${totalFixes} fix(es) found before stopping — buttons above still work.`
                : "";
            stream.markdown(`\n\n---\n_Cancelled._${tail}`);
            return {};
        }
        if (totalFixes === 0) {
            stream.markdown("\n\nNo issues found.");
        }
        else {
            stream.markdown(`\n\n---\n${totalFixes} proposed fix(es). Click a button to apply — the change lands in the editor unsaved so you can review or undo it.`);
        }
        return {};
    }
    finally {
        hostCancel.dispose();
        if (activeRun === cts) {
            activeRun = undefined;
        }
        cts.dispose();
    }
};
async function applyFileEdits(args) {
    const uri = vscode.Uri.file(args.fsPath);
    const doc = await vscode.workspace.openTextDocument(uri);
    const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, fullRange, args.content);
    const ok = await vscode.workspace.applyEdit(edit);
    if (ok) {
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage(`Applied fixes to ${path.basename(args.fsPath)} — review and save.`);
    }
    else {
        vscode.window.showErrorMessage(`Could not apply fixes to ${path.basename(args.fsPath)}.`);
    }
}
async function safeFileDiff(root, scope, file) {
    try {
        return await (0, git_1.getFileDiff)(root, scope, file);
    }
    catch {
        return "";
    }
}
function errorMessage(err) {
    return err instanceof Error ? err.message : String(err);
}
//# sourceMappingURL=chat.js.map