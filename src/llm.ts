import * as vscode from "vscode";
import type { Prompt } from "./prompts";

export class NoModelError extends Error {
  constructor() {
    super(
      "No language model is available. Install GitHub Copilot and sign in, then try again.",
    );
    this.name = "NoModelError";
  }
}

async function selectModel(family: string): Promise<vscode.LanguageModelChat> {
  const selector: vscode.LanguageModelChatSelector = family
    ? { vendor: "copilot", family }
    : { vendor: "copilot" };
  const models = await vscode.lm.selectChatModels(selector);
  if (models.length === 0) {
    throw new NoModelError();
  }
  return models[0];
}

export async function sendPrompt(
  model: vscode.LanguageModelChat,
  prompt: Prompt,
  onChunk: ((text: string) => void) | undefined,
  token: vscode.CancellationToken,
): Promise<string> {
  const messages = [
    vscode.LanguageModelChatMessage.User(prompt.system),
    vscode.LanguageModelChatMessage.User(prompt.user),
  ];

  const response = await model.sendRequest(messages, {}, token);
  let full = "";
  for await (const fragment of response.text) {
    full += fragment;
    onChunk?.(fragment);
  }
  return full;
}

export async function runPrompt(
  prompt: Prompt,
  family: string,
  onChunk: (text: string) => void,
  token: vscode.CancellationToken,
): Promise<string> {
  const model = await selectModel(family);
  return sendPrompt(model, prompt, onChunk, token);
}
