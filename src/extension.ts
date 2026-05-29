import * as vscode from "vscode";
import { registerChat } from "./chat";
import { registerPreview } from "./preview";
import { generateProjectDocs } from "./features/projectdocs";

export function activate(context: vscode.ExtensionContext): void {
  registerPreview(context);
  registerChat(context);
  context.subscriptions.push(
    vscode.commands.registerCommand("aiReview.reviewCode", () => openChat("/review")),
    vscode.commands.registerCommand("aiReview.securityCheck", () =>
      openChat("/security"),
    ),
    vscode.commands.registerCommand("aiReview.generateProjectDocs", () =>
      generateProjectDocs(),
    ),
  );
}

export function deactivate(): void {}

function openChat(command: string): Thenable<unknown> {
  return vscode.commands.executeCommand("workbench.action.chat.open", {
    query: `@aireview ${command}`,
  });
}
