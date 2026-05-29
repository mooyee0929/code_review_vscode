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
exports.generate = generate;
const vscode = __importStar(require("vscode"));
const backend_1 = require("./backend");
const claudeCode_1 = require("./claudeCode");
const llm_1 = require("./llm");
async function generate(title, prompt) {
    let result = "";
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `AI ${title}`,
            cancellable: true,
        }, async (progress, token) => {
            let acc = "";
            result = await (0, backend_1.completePrompt)(prompt, token, {
                onChunk: (chunk) => {
                    acc += chunk;
                    progress.report({ message: `generating… ${acc.length} chars` });
                },
            });
        });
    }
    catch (err) {
        if (err instanceof vscode.CancellationError) {
            return undefined;
        }
        if (err instanceof llm_1.NoModelError || err instanceof claudeCode_1.ClaudeCodeError) {
            vscode.window.showErrorMessage(err.message);
        }
        else if (err instanceof vscode.LanguageModelError) {
            vscode.window.showErrorMessage(`Model error: ${err.message}`);
        }
        else {
            const message = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`AI ${title} failed: ${message}`);
        }
        return undefined;
    }
    return result.trim().length > 0 ? result : undefined;
}
//# sourceMappingURL=runner.js.map