"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildReviewPrompt = buildReviewPrompt;
exports.buildSecurityPrompt = buildSecurityPrompt;
exports.buildProjectDocPrompt = buildProjectDocPrompt;
const JSON_PROTOCOL = [
    "Return ONLY a JSON object — no prose, no markdown fences — of exactly this shape:",
    '{"edits":[{"find":"...","replace":"...","severity":"High","category":"...","explanation":"..."}]}',
    "Rules for each edit:",
    "- `find`: an EXACT, verbatim snippet copied from the file content below, long enough to occur only once in the file.",
    "- `replace`: the corrected code. It MUST NOT contain any comment that explains the fix — keep the applied code clean.",
    "- `severity`: one of Critical, High, Medium, Low.",
    "- `category`: a short tag for the kind of issue.",
    "- `explanation`: one sentence on why the change is needed. This is metadata for a summary and is never inserted into the code.",
    "Only propose edits for genuine issues in the code that changed. If there are none, return {\"edits\":[]}.",
].join("\n");
function fixUser(filePath, content, diff, truncated) {
    const note = truncated
        ? " (truncated to fit context; only edits within the shown portion are valid)"
        : "";
    return [
        `File: ${filePath}`,
        "",
        "Diff for the recent changes to this file:",
        "```diff",
        diff,
        "```",
        "",
        `Full current content of the file${note}:`,
        "```",
        content,
        "```",
    ].join("\n");
}
function buildReviewPrompt(persona, filePath, content, diff, truncated = false) {
    const system = [
        persona,
        "Review this single changed file and propose concrete fixes. Focus on issues in the code that changed: correctness (logic, edge cases, null/undefined, error handling), tests, performance, and maintainability.",
        "Security is handled by a separate command — skip it here unless severe and obvious.",
        "",
        JSON_PROTOCOL,
    ].join("\n");
    return { system, user: fixUser(filePath, content, diff, truncated) };
}
function buildSecurityPrompt(persona, filePath, content, diff, truncated = false) {
    const system = [
        persona,
        "Review this single changed file for security vulnerabilities and propose concrete fixes.",
        "Look for: injection (SQL, command, LDAP, XSS), hardcoded secrets, broken authentication/authorization, path traversal, SSRF, unsafe deserialization, weak or misused cryptography, and sensitive data exposure.",
        "Put the OWASP Top 10 category or CWE id in `category` where you can.",
        "",
        JSON_PROTOCOL,
    ].join("\n");
    return { system, user: fixUser(filePath, content, diff, truncated) };
}
function buildProjectDocPrompt(docName, template, digest) {
    const system = [
        `You are writing the \`${docName}\` file for a software project.`,
        "Fill out the provided template using ONLY facts evident from the repository digest below.",
        "Keep the template's section structure and headings.",
        "Do not invent APIs, commands, or behavior. If a section cannot be determined from the digest, leave a clear `TODO:` note explaining what is missing.",
        "Infer the project name from the digest (a manifest name field, or the root folder).",
        "Respond with the finished Markdown document only — no preamble and no surrounding code fence.",
    ].join("\n");
    const user = [
        "## Repository digest",
        digest,
        "",
        `## Template for ${docName}`,
        template,
    ].join("\n");
    return { system, user };
}
//# sourceMappingURL=prompts.js.map