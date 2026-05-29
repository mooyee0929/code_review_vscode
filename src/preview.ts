import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";

const SCHEME = "aidocs-preview";

class ProposedProvider implements vscode.TextDocumentContentProvider {
  private readonly store = new Map<string, string>();

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.store.get(uri.toString()) ?? "";
  }

  set(uri: vscode.Uri, content: string): void {
    this.store.set(uri.toString(), content);
  }

  delete(uri: vscode.Uri): void {
    this.store.delete(uri.toString());
  }
}

let provider: ProposedProvider | undefined;
let counter = 0;

export function registerPreview(context: vscode.ExtensionContext): void {
  provider = new ProposedProvider();
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(SCHEME, provider),
  );
}

function createProposed(name: string, content: string): vscode.Uri {
  counter += 1;
  const uri = vscode.Uri.parse(`${SCHEME}:/${counter}/${name}`);
  provider?.set(uri, content);
  return uri;
}

// Show the generated content on the right (a diff when the target already
// exists, otherwise the proposed file), ask Accept/Discard in a modal, and
// only write the file on Accept. Returns whether it was applied.
export async function proposeAndConfirm(
  target: vscode.Uri,
  content: string,
  detail: string,
): Promise<boolean> {
  const name = path.basename(target.fsPath);
  const proposed = createProposed(name, content);
  const exists = await fileExists(target.fsPath);

  if (exists) {
    await vscode.commands.executeCommand(
      "vscode.diff",
      target,
      proposed,
      `${name} — proposed changes`,
      { viewColumn: vscode.ViewColumn.Beside, preview: true },
    );
  } else {
    const doc = await vscode.workspace.openTextDocument(proposed);
    await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.Beside,
      preview: true,
    });
  }

  const choice = await vscode.window.showInformationMessage(
    `Apply ${name}?`,
    { modal: true, detail },
    "Accept",
    "Discard",
  );
  await closeProposed(proposed);

  if (choice !== "Accept") {
    return false;
  }

  const body = content.endsWith("\n") ? content : `${content}\n`;
  await fs.writeFile(target.fsPath, body, "utf8");

  if (path.extname(target.fsPath).toLowerCase() === ".md") {
    await vscode.commands.executeCommand("markdown.showPreviewToSide", target);
  } else {
    const doc = await vscode.workspace.openTextDocument(target);
    await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.Beside,
    });
  }
  return true;
}

async function closeProposed(uri: vscode.Uri): Promise<void> {
  const key = uri.toString();
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      const input = tab.input;
      const match =
        (input instanceof vscode.TabInputText && input.uri.toString() === key) ||
        (input instanceof vscode.TabInputTextDiff &&
          input.modified.toString() === key);
      if (match) {
        await vscode.window.tabGroups.close(tab);
      }
    }
  }
  provider?.delete(uri);
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}
