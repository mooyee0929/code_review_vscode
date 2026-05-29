import { Dirent } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "out", "dist", "build", ".venv", "venv",
  "__pycache__", ".next", "target", ".idea", ".vscode-test", "coverage", ".turbo",
]);

const MANIFEST_FILES = [
  "package.json", "tsconfig.json", "pyproject.toml", "requirements.txt",
  "setup.py", "Cargo.toml", "go.mod", "pom.xml", "build.gradle",
  "Gemfile", "composer.json",
];

const MAX_TREE_ENTRIES = 400;
const MAX_DEPTH = 5;
const MANIFEST_MAX_CHARS = 4000;

export interface RepoDigest {
  type: string;
  languages: string;
  tree: string;
  manifests: string;
}

export function classifyRepoType(relPaths: string[]): string {
  const has = (name: string): boolean =>
    relPaths.some((p) => p === name || p.endsWith(`/${name}`));
  const hasExt = (ext: string): boolean =>
    relPaths.some((p) => p.toLowerCase().endsWith(ext));

  const types: string[] = [];
  if (has("package.json")) {
    types.push(
      has("tsconfig.json") || hasExt(".ts")
        ? "Node.js / TypeScript"
        : "Node.js / JavaScript",
    );
  }
  if (has("pyproject.toml") || has("requirements.txt") || has("setup.py") || hasExt(".py")) {
    types.push("Python");
  }
  if (has("Cargo.toml")) types.push("Rust");
  if (has("go.mod")) types.push("Go");
  if (has("pom.xml") || has("build.gradle")) types.push("Java / JVM");
  if (has("Gemfile")) types.push("Ruby");
  if (has("composer.json")) types.push("PHP");

  if (types.length === 0) return "Unknown";
  if (types.length === 1) return types[0];
  return `Mixed (${types.join(", ")})`;
}

export function summarizeLanguages(relPaths: string[]): string {
  const counts = new Map<string, number>();
  for (const p of relPaths) {
    const ext = path.extname(p).toLowerCase();
    if (!ext) continue;
    counts.set(ext, (counts.get(ext) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  return top.length === 0 ? "n/a" : top.map(([ext, n]) => `${ext} (${n})`).join(", ");
}

export async function buildDigest(root: string): Promise<RepoDigest> {
  const relPaths = await walk(root);
  return {
    type: classifyRepoType(relPaths),
    languages: summarizeLanguages(relPaths),
    tree: relPaths.join("\n"),
    manifests: await readManifests(root),
  };
}

async function walk(root: string): Promise<string[]> {
  const results: string[] = [];

  async function recurse(dir: string, depth: number): Promise<void> {
    if (depth > MAX_DEPTH || results.length >= MAX_TREE_ENTRIES) return;
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= MAX_TREE_ENTRIES) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        await recurse(full, depth + 1);
      } else {
        results.push(path.relative(root, full));
      }
    }
  }

  await recurse(root, 0);
  return results.sort();
}

async function readManifests(root: string): Promise<string> {
  const parts: string[] = [];
  for (const name of MANIFEST_FILES) {
    try {
      const content = await fs.readFile(path.join(root, name), "utf8");
      const trimmed =
        content.length > MANIFEST_MAX_CHARS
          ? `${content.slice(0, MANIFEST_MAX_CHARS)}\n…(truncated)`
          : content;
      parts.push(`### ${name}\n${trimmed}`);
    } catch {
      // manifest not present — skip
    }
  }
  return parts.length > 0 ? parts.join("\n\n") : "(no manifest files found)";
}
