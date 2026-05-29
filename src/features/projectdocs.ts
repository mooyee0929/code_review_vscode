import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { proposeAndConfirm } from "../preview";
import { buildProjectDocPrompt } from "../prompts";
import { buildDigest, RepoDigest } from "../repoScan";
import { generate } from "../runner";
import { DEFAULT_TEMPLATES, DOC_SET, DocName } from "../templates";

export async function generateProjectDocs(): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) {
    vscode.window.showErrorMessage("Open a folder before generating project docs.");
    return;
  }

  const existence = await Promise.all(
    DOC_SET.map(async (name) => ({
      name,
      exists: await fileExists(path.join(root, name)),
    })),
  );

  const picks = await vscode.window.showQuickPick(
    existence.map((it) => ({
      label: it.name,
      description: it.exists ? "exists — pick to overwrite" : "missing — will create",
      picked: !it.exists,
    })),
    {
      canPickMany: true,
      placeHolder: "Select docs to generate (missing ones are pre-selected)",
    },
  );
  if (!picks || picks.length === 0) {
    return;
  }

  const digestText = formatDigest(await buildDigest(root));

  const applied: string[] = [];
  for (const pick of picks) {
    const name = pick.label as DocName;
    const template = await loadTemplate(root, name);
    const text = await generate(
      `Docs: ${name}`,
      buildProjectDocPrompt(name, template, digestText),
    );
    if (!text) {
      continue;
    }
    const target = vscode.Uri.file(path.join(root, name));
    if (await proposeAndConfirm(target, text, `Project doc: ${name}`)) {
      applied.push(name);
    }
  }

  if (applied.length > 0) {
    vscode.window.showInformationMessage(`Applied: ${applied.join(", ")}`);
  }
}

async function loadTemplate(root: string, name: DocName): Promise<string> {
  const custom = path.join(root, ".aidocs", "templates", name);
  try {
    return await fs.readFile(custom, "utf8");
  } catch {
    return DEFAULT_TEMPLATES[name];
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

function formatDigest(d: RepoDigest): string {
  return [
    `Detected type: ${d.type}`,
    `Languages: ${d.languages}`,
    "",
    "File tree:",
    "```",
    d.tree,
    "```",
    "",
    "Manifests:",
    d.manifests,
  ].join("\n");
}
