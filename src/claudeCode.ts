import { spawn } from "node:child_process";
import * as vscode from "vscode";
import type { Prompt } from "./prompts";

export class ClaudeCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaudeCodeError";
  }
}

// Runs the Claude Code CLI in headless print mode: the system prompt is passed
// as --system-prompt and the user content is piped via stdin. Streams stdout
// through onChunk and resolves with the full text.
export function completeWithClaudeCode(
  prompt: Prompt,
  token: vscode.CancellationToken,
  onChunk?: (text: string) => void,
): Promise<string> {
  const config = vscode.workspace.getConfiguration("aiReview");
  const cli = config.get<string>("claudeCodePath", "claude");
  const model = config.get<string>("claudeCodeModel", "");

  const args = ["-p", "--output-format", "text", "--system-prompt", prompt.system];
  if (model) {
    args.push("--model", model);
  }

  return new Promise<string>((resolve, reject) => {
    const child = spawn(cli, args, {
      cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
    });

    let out = "";
    let err = "";
    const cancelSub = token.onCancellationRequested(() => child.kill());

    child.on("error", (e) => {
      cancelSub.dispose();
      reject(
        new ClaudeCodeError(
          `Could not run "${cli}". Is Claude Code installed and on PATH? (${e.message})`,
        ),
      );
    });
    child.stdout.on("data", (data) => {
      const chunk = data.toString();
      out += chunk;
      onChunk?.(chunk);
    });
    child.stderr.on("data", (data) => {
      err += data.toString();
    });
    child.on("close", (code) => {
      cancelSub.dispose();
      if (token.isCancellationRequested) {
        reject(new vscode.CancellationError());
        return;
      }
      if (code === 0) {
        resolve(out);
        return;
      }
      reject(new ClaudeCodeError(err.trim() || `claude exited with code ${code}`));
    });

    child.stdin.end(prompt.user);
  });
}
