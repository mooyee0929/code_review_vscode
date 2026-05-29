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
exports.NoModelError = void 0;
exports.sendPrompt = sendPrompt;
exports.runPrompt = runPrompt;
const vscode = __importStar(require("vscode"));
class NoModelError extends Error {
    constructor() {
        super("No language model is available. Install GitHub Copilot and sign in, then try again.");
        this.name = "NoModelError";
    }
}
exports.NoModelError = NoModelError;
async function selectModel(family) {
    const selector = family
        ? { vendor: "copilot", family }
        : { vendor: "copilot" };
    const models = await vscode.lm.selectChatModels(selector);
    if (models.length === 0) {
        throw new NoModelError();
    }
    return models[0];
}
async function sendPrompt(model, prompt, onChunk, token) {
    const messages = [
        vscode.LanguageModelChatMessage.User(prompt.system),
        vscode.LanguageModelChatMessage.User(prompt.user),
    ];
    const response = await model.sendRequest(messages, {}, token);
    let full = "";
    for await (const fragment of response.text) {
        full += fragment;
        onChunk?.(fragment);
    }
    return full;
}
async function runPrompt(prompt, family, onChunk, token) {
    const model = await selectModel(family);
    return sendPrompt(model, prompt, onChunk, token);
}
//# sourceMappingURL=llm.js.map