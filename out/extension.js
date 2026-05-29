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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const chat_1 = require("./chat");
const preview_1 = require("./preview");
const projectdocs_1 = require("./features/projectdocs");
function activate(context) {
    (0, preview_1.registerPreview)(context);
    (0, chat_1.registerChat)(context);
    context.subscriptions.push(vscode.commands.registerCommand("aiReview.reviewCode", () => openChat("/review")), vscode.commands.registerCommand("aiReview.securityCheck", () => openChat("/security")), vscode.commands.registerCommand("aiReview.generateProjectDocs", () => (0, projectdocs_1.generateProjectDocs)()));
}
function deactivate() { }
function openChat(command) {
    return vscode.commands.executeCommand("workbench.action.chat.open", {
        query: `@aireview ${command}`,
    });
}
//# sourceMappingURL=extension.js.map