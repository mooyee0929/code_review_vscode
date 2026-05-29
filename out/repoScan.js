"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyRepoType = classifyRepoType;
exports.summarizeLanguages = summarizeLanguages;
exports.buildDigest = buildDigest;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
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
function classifyRepoType(relPaths) {
    const has = (name) => relPaths.some((p) => p === name || p.endsWith(`/${name}`));
    const hasExt = (ext) => relPaths.some((p) => p.toLowerCase().endsWith(ext));
    const types = [];
    if (has("package.json")) {
        types.push(has("tsconfig.json") || hasExt(".ts")
            ? "Node.js / TypeScript"
            : "Node.js / JavaScript");
    }
    if (has("pyproject.toml") || has("requirements.txt") || has("setup.py") || hasExt(".py")) {
        types.push("Python");
    }
    if (has("Cargo.toml"))
        types.push("Rust");
    if (has("go.mod"))
        types.push("Go");
    if (has("pom.xml") || has("build.gradle"))
        types.push("Java / JVM");
    if (has("Gemfile"))
        types.push("Ruby");
    if (has("composer.json"))
        types.push("PHP");
    if (types.length === 0)
        return "Unknown";
    if (types.length === 1)
        return types[0];
    return `Mixed (${types.join(", ")})`;
}
function summarizeLanguages(relPaths) {
    const counts = new Map();
    for (const p of relPaths) {
        const ext = path.extname(p).toLowerCase();
        if (!ext)
            continue;
        counts.set(ext, (counts.get(ext) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return top.length === 0 ? "n/a" : top.map(([ext, n]) => `${ext} (${n})`).join(", ");
}
async function buildDigest(root) {
    const relPaths = await walk(root);
    return {
        type: classifyRepoType(relPaths),
        languages: summarizeLanguages(relPaths),
        tree: relPaths.join("\n"),
        manifests: await readManifests(root),
    };
}
async function walk(root) {
    const results = [];
    async function recurse(dir, depth) {
        if (depth > MAX_DEPTH || results.length >= MAX_TREE_ENTRIES)
            return;
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (results.length >= MAX_TREE_ENTRIES)
                return;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (IGNORE_DIRS.has(entry.name))
                    continue;
                await recurse(full, depth + 1);
            }
            else {
                results.push(path.relative(root, full));
            }
        }
    }
    await recurse(root, 0);
    return results.sort();
}
async function readManifests(root) {
    const parts = [];
    for (const name of MANIFEST_FILES) {
        try {
            const content = await fs.readFile(path.join(root, name), "utf8");
            const trimmed = content.length > MANIFEST_MAX_CHARS
                ? `${content.slice(0, MANIFEST_MAX_CHARS)}\n…(truncated)`
                : content;
            parts.push(`### ${name}\n${trimmed}`);
        }
        catch {
            // manifest not present — skip
        }
    }
    return parts.length > 0 ? parts.join("\n\n") : "(no manifest files found)";
}
//# sourceMappingURL=repoScan.js.map