import * as vscode from "vscode";
import { completePrompt } from "./backend";
import { ClaudeCodeError } from "./claudeCode";
import { NoModelError } from "./llm";
import type { Prompt } from "./prompts";

export async function generate(
  title: string,
  prompt: Prompt,
): Promise<string | undefined> {
  let result = "";
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `AI ${title}`,
        cancellable: true,
      },
      async (progress, token) => {
        let acc = "";
        result = await completePrompt(prompt, token, {
          onChunk: (chunk) => {
            acc += chunk;
            progress.report({ message: `generating… ${acc.length} chars` });
          },
        });
      },
    );
  } catch (err) {
    if (err instanceof vscode.CancellationError) {
      return undefined;
    }
    if (err instanceof NoModelError || err instanceof ClaudeCodeError) {
      vscode.window.showErrorMessage(err.message);
    } else if (err instanceof vscode.LanguageModelError) {
      vscode.window.showErrorMessage(`Model error: ${err.message}`);
    } else {
      const message = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`AI ${title} failed: ${message}`);
    }
    return undefined;
  }

  return result.trim().length > 0 ? result : undefined;
}
