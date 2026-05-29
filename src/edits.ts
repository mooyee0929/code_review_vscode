export interface FixEdit {
  find: string;
  replace: string;
  severity: string;
  category: string;
  explanation: string;
}

export interface ApplyResult {
  result: string;
  applied: FixEdit[];
  skipped: FixEdit[];
}

export function parseEdits(raw: string): FixEdit[] {
  const json = extractJsonObject(raw);
  if (!json) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  const edits = (parsed as { edits?: unknown }).edits;
  if (!Array.isArray(edits)) {
    return [];
  }

  const out: FixEdit[] = [];
  for (const raw of edits) {
    const e = raw as Partial<FixEdit>;
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

function extractJsonObject(raw: string): string | undefined {
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
export function applyEdits(content: string, edits: FixEdit[]): ApplyResult {
  let result = content;
  const applied: FixEdit[] = [];
  const skipped: FixEdit[] = [];

  for (const edit of edits) {
    const first = result.indexOf(edit.find);
    const last = result.lastIndexOf(edit.find);
    if (first !== -1 && first === last) {
      result = result.slice(0, first) + edit.replace + result.slice(first + edit.find.length);
      applied.push(edit);
    } else {
      skipped.push(edit);
    }
  }

  return { result, applied, skipped };
}
