"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseScope = parseScope;
exports.describeScope = describeScope;
exports.isGitRepo = isGitRepo;
exports.getChangedFiles = getChangedFiles;
exports.getFileDiff = getFileDiff;
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
function parseScope(text) {
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();
    if (lower === "" || lower === "uncommitted") {
        return { kind: "uncommitted" };
    }
    if (lower === "staged") {
        return { kind: "staged" };
    }
    return { kind: "branch", base: trimmed };
}
function describeScope(scope) {
    switch (scope.kind) {
        case "uncommitted":
            return "uncommitted changes";
        case "staged":
            return "staged changes";
        case "branch":
            return `changes vs ${scope.base}`;
    }
}
async function git(cwd, args) {
    const { stdout } = await execFileAsync("git", args, {
        cwd,
        maxBuffer: 50 * 1024 * 1024,
    });
    return stdout;
}
async function isGitRepo(cwd) {
    try {
        const out = await git(cwd, ["rev-parse", "--is-inside-work-tree"]);
        return out.trim() === "true";
    }
    catch {
        return false;
    }
}
function rangeArgs(scope) {
    switch (scope.kind) {
        case "uncommitted":
            return ["HEAD"];
        case "staged":
            return ["--cached"];
        case "branch":
            return [`${scope.base}...HEAD`];
    }
}
async function getChangedFiles(cwd, scope) {
    const out = await git(cwd, ["diff", "--name-only", ...rangeArgs(scope)]);
    return out
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}
async function getFileDiff(cwd, scope, file) {
    return git(cwd, ["diff", ...rangeArgs(scope), "--", file]);
}
//# sourceMappingURL=git.js.map