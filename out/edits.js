"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEdits = parseEdits;
exports.applyEdits = applyEdits;
function parseEdits(raw) {
    const json = extractJsonObject(raw);
    if (!json) {
        return [];
    }
    let parsed;
    try {
        parsed = JSON.parse(json);
    }
    catch {
        return [];
    }
    const edits = parsed.edits;
    if (!Array.isArray(edits)) {
        return [];
    }
    const out = [];
    for (const raw of edits) {
        const e = raw;
        if (typeof e.find === "string" && e.find.length > 0 && typeof e.replace === "string") {
            out.push({
                find: e.find,
                replace: e.replace,
                severity: typeof e.severity === "string" ? e.severity : "Info",
                category: typeof e.category === "string" ? e.category : "General",
                explanation: typeof e.explanation === "string" ? e.explanation : "",
            });
        }
    }
    return out;
}
function extractJsonObject(raw) {
    const withoutFences = raw.replace(/```(?:json)?/gi, "");
    const start = withoutFences.indexOf("{");
    const end = withoutFences.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) {
        return undefined;
    }
    return withoutFences.slice(start, end + 1);
}
// Applies each edit only when its `find` snippet occurs exactly once in the
// current working copy, so ambiguous or stale snippets are skipped, not
// misapplied.
function applyEdits(content, edits) {
    let result = content;
    const applied = [];
    const skipped = [];
    for (const edit of edits) {
        const first = result.indexOf(edit.find);
        const last = result.lastIndexOf(edit.find);
        if (first !== -1 && first === last) {
            result = result.slice(0, first) + edit.replace + result.slice(first + edit.find.length);
            applied.push(edit);
        }
        else {
            skipped.push(edit);
        }
    }
    return { result, applied, skipped };
}
//# sourceMappingURL=edits.js.map