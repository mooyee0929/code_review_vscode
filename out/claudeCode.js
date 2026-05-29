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
exports.ClaudeCodeError = void 0;
exports.completeWithClaudeCode = completeWithClaudeCode;
const node_child_process_1 = require("node:child_process");
const vscode = __importStar(require("vscode"));
class ClaudeCodeError extends Error {
    constructor(message) {
        super(message);
        this.name = "ClaudeCodeError";
    }
}
exports.ClaudeCodeError = ClaudeCodeError;
// Runs the Claude Code CLI in headless print mode: the system prompt is passed
// as --system-prompt and the user content is piped via stdin. Streams stdout
// through onChunk and resolves with the full text.
function completeWithClaudeCode(prompt, token, onChunk) {
    const config = vscode.workspace.getConfiguration("aiReview");
    const cli = config.get("claudeCodePath", "claude");
    const model = config.get("claudeCodeModel", "");
    const args = ["-p", "--output-format", "text", "--system-prompt", prompt.system];
    if (model) {
        args.push("--model", model);
    }
    return new Promise((resolve, reject) => {
        const child = (0, node_child_process_1.spawn)(cli, args, {
            cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        });
        let out = "";
        let err = "";
        const cancelSub = token.onCancellationRequested(() => child.kill());
        child.on("error", (e) => {
            cancelSub.dispose();
            reject(new ClaudeCodeError(`Could not run "${cli}". Is Claude Code installed and on PATH? (${e.message})`));
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
//# sourceMappingURL=claudeCode.js.map