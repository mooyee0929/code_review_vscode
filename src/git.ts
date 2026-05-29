import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type DiffScope =
  | { kind: "uncommitted" }
  | { kind: "staged" }
  | { kind: "branch"; base: string };

export function parseScope(text: string): DiffScope {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "" || lower === "uncommitted") {
    return { kind: "uncommitted" };
  }
  if (lower === "staged") {
    return { kind: "staged" };
  }
  return { kind: "branch", base: trimmed };
}

export function describeScope(scope: DiffScope): string {
  switch (scope.kind) {
    case "uncommitted":
      return "uncommitted changes";
    case "staged":
      return "staged changes";
    case "branch":
      return `changes vs ${scope.base}`;
  }
}

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    maxBuffer: 50 * 1024 * 1024,
  });
  return stdout;
}

export async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    const out = await git(cwd, ["rev-parse", "--is-inside-work-tree"]);
    return out.trim() === "true";
  } catch {
    return false;
  }
}

function rangeArgs(scope: DiffScope): string[] {
  switch (scope.kind) {
    case "uncommitted":
      return ["HEAD"];
    case "staged":
      return ["--cached"];
    case "branch":
      return [`${scope.base}...HEAD`];
  }
}

export async function getChangedFiles(
  cwd: string,
  scope: DiffScope,
): Promise<string[]> {
  const out = await git(cwd, ["diff", "--name-only", ...rangeArgs(scope)]);
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export async function getFileDiff(
  cwd: string,
  scope: DiffScope,
  file: string,
): Promise<string> {
  return git(cwd, ["diff", ...rangeArgs(scope), "--", file]);
}
