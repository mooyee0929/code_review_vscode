import * as vscode from "vscode";
import { completeWithClaudeCode } from "./claudeCode";
import { runPrompt, sendPrompt } from "./llm";
import type { Prompt } from "./prompts";

export type BackendKind = "claude-code" | "vscode-lm";

export function currentBackend(): BackendKind {
  const value = vscode.workspace
    .getConfiguration("aiReview")
    .get<string>("backend", "claude-code");
  return value === "vscode-lm" ? "vscode-lm" : "claude-code";
}

export interface CompleteOptions {
  // When the vscode-lm backend is active and a chat-provided model is given,
  // it is used directly; otherwise a Copilot model is selected by family.
  model?: vscode.LanguageModelChat;
  onChunk?: (text: string) => void;
}

export async function completePrompt(
  prompt: Prompt,
  token: vscode.CancellationToken,
  options: CompleteOptions = {},
): Promise<string> {
  if (currentBackend() === "claude-code") {
    return completeWithClaudeCode(prompt, token, options.onChunk);
  }
  if (options.model) {
    return sendPrompt(options.model, prompt, options.onChunk, token);
  }
  const family = vscode.workspace
    .getConfiguration("aiReview")
    .get<string>("modelFamily", "");
  return runPrompt(prompt, family, options.onChunk ?? (() => {}), token);
}
