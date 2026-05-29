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
exports.registerPreview = registerPreview;
exports.proposeAndConfirm = proposeAndConfirm;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const vscode = __importStar(require("vscode"));
const SCHEME = "aidocs-preview";
class ProposedProvider {
    store = new Map();
    provideTextDocumentContent(uri) {
        return this.store.get(uri.toString()) ?? "";
    }
    set(uri, content) {
        this.store.set(uri.toString(), content);
    }
    delete(uri) {
        this.store.delete(uri.toString());
    }
}
let provider;
let counter = 0;
function registerPreview(context) {
    provider = new ProposedProvider();
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(SCHEME, provider));
}
function createProposed(name, content) {
    counter += 1;
    const uri = vscode.Uri.parse(`${SCHEME}:/${counter}/${name}`);
    provider?.set(uri, content);
    return uri;
}
// Show the generated content on the right (a diff when the target already
// exists, otherwise the proposed file), ask Accept/Discard in a modal, and
// only write the file on Accept. Returns whether it was applied.
async function proposeAndConfirm(target, content, detail) {
    const name = path.basename(target.fsPath);
    const proposed = createProposed(name, content);
    const exists = await fileExists(target.fsPath);
    if (exists) {
        await vscode.commands.executeCommand("vscode.diff", target, proposed, `${name} — proposed changes`, { viewColumn: vscode.ViewColumn.Beside, preview: true });
    }
    else {
        const doc = await vscode.workspace.openTextDocument(proposed);
        await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.Beside,
            preview: true,
        });
    }
    const choice = await vscode.window.showInformationMessage(`Apply ${name}?`, { modal: true, detail }, "Accept", "Discard");
    await closeProposed(proposed);
    if (choice !== "Accept") {
        return false;
    }
    const body = content.endsWith("\n") ? content : `${content}\n`;
    await fs.writeFile(target.fsPath, body, "utf8");
    if (path.extname(target.fsPath).toLowerCase() === ".md") {
        await vscode.commands.executeCommand("markdown.showPreviewToSide", target);
    }
    else {
        const doc = await vscode.workspace.openTextDocument(target);
        await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.Beside,
        });
    }
    return true;
}
async function closeProposed(uri) {
    const key = uri.toString();
    for (const group of vscode.window.tabGroups.all) {
        for (const tab of group.tabs) {
            const input = tab.input;
            const match = (input instanceof vscode.TabInputText && input.uri.toString() === key) ||
                (input instanceof vscode.TabInputTextDiff &&
                    input.modified.toString() === key);
            if (match) {
                await vscode.window.tabGroups.close(tab);
            }
        }
    }
    provider?.delete(uri);
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
//# sourceMappingURL=preview.js.map