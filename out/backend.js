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
exports.currentBackend = currentBackend;
exports.completePrompt = completePrompt;
const vscode = __importStar(require("vscode"));
const claudeCode_1 = require("./claudeCode");
const llm_1 = require("./llm");
function currentBackend() {
    const value = vscode.workspace
        .getConfiguration("aiReview")
        .get("backend", "claude-code");
    return value === "vscode-lm" ? "vscode-lm" : "claude-code";
}
async function completePrompt(prompt, token, options = {}) {
    if (currentBackend() === "claude-code") {
        return (0, claudeCode_1.completeWithClaudeCode)(prompt, token, options.onChunk);
    }
    if (options.model) {
        return (0, llm_1.sendPrompt)(options.model, prompt, options.onChunk, token);
    }
    const family = vscode.workspace
        .getConfiguration("aiReview")
        .get("modelFamily", "");
    return (0, llm_1.runPrompt)(prompt, family, options.onChunk ?? (() => { }), token);
}
//# sourceMappingURL=backend.js.map