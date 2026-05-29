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
exports.generateProjectDocs = generateProjectDocs;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const vscode = __importStar(require("vscode"));
const preview_1 = require("../preview");
const prompts_1 = require("../prompts");
const repoScan_1 = require("../repoScan");
const runner_1 = require("../runner");
const templates_1 = require("../templates");
async function generateProjectDocs() {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
        vscode.window.showErrorMessage("Open a folder before generating project docs.");
        return;
    }
    const existence = await Promise.all(templates_1.DOC_SET.map(async (name) => ({
        name,
        exists: await fileExists(path.join(root, name)),
    })));
    const picks = await vscode.window.showQuickPick(existence.map((it) => ({
        label: it.name,
        description: it.exists ? "exists — pick to overwrite" : "missing — will create",
        picked: !it.exists,
    })), {
        canPickMany: true,
        placeHolder: "Select docs to generate (missing ones are pre-selected)",
    });
    if (!picks || picks.length === 0) {
        return;
    }
    const digestText = formatDigest(await (0, repoScan_1.buildDigest)(root));
    const applied = [];
    for (const pick of picks) {
        const name = pick.label;
        const template = await loadTemplate(root, name);
        const text = await (0, runner_1.generate)(`Docs: ${name}`, (0, prompts_1.buildProjectDocPrompt)(name, template, digestText));
        if (!text) {
            continue;
        }
        const target = vscode.Uri.file(path.join(root, name));
        if (await (0, preview_1.proposeAndConfirm)(target, text, `Project doc: ${name}`)) {
            applied.push(name);
        }
    }
    if (applied.length > 0) {
        vscode.window.showInformationMessage(`Applied: ${applied.join(", ")}`);
    }
}
async function loadTemplate(root, name) {
    const custom = path.join(root, ".aidocs", "templates", name);
    try {
        return await fs.readFile(custom, "utf8");
    }
    catch {
        return templates_1.DEFAULT_TEMPLATES[name];
    }
}
async function fileExists(p) {
    try {
        await fs.stat(p);
        return true;
    }
    catch {
        return false;
    }
}
function formatDigest(d) {
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
//# sourceMappingURL=projectdocs.js.map