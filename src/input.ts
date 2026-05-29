import * as vscode from "vscode";

export interface Clamped {
  text: string;
  truncated: boolean;
}

function maxInputChars(): number {
  return vscode.workspace
    .getConfiguration("aiReview")
    .get<number>("maxInputChars", 100000);
}

export function clamp(text: string): Clamped {
  const max = maxInputChars();
  const truncated = text.length > max;
  return { text: truncated ? text.slice(0, max) : text, truncated };
}
