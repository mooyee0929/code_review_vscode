const test = require("node:test");
const assert = require("node:assert/strict");
const { parseEdits, applyEdits } = require("../out/edits.js");

test("parses edits from a fenced JSON response", () => {
  const raw =
    '```json\n{"edits":[{"find":"a==b","replace":"a===b","severity":"High","category":"Correctness","explanation":"strict equality"}]}\n```';
  const edits = parseEdits(raw);
  assert.equal(edits.length, 1);
  assert.equal(edits[0].find, "a==b");
  assert.equal(edits[0].replace, "a===b");
  assert.equal(edits[0].severity, "High");
});

test("returns empty array on invalid or empty JSON", () => {
  assert.deepEqual(parseEdits("not json"), []);
  assert.deepEqual(parseEdits('{"edits":[]}'), []);
});

test("defaults missing optional fields", () => {
  const edits = parseEdits('{"edits":[{"find":"x","replace":"y"}]}');
  assert.equal(edits.length, 1);
  assert.equal(edits[0].severity, "Info");
  assert.equal(edits[0].category, "General");
});

test("applies a uniquely-located edit", () => {
  const { result, applied, skipped } = applyEdits("const x = a == b;", [
    { find: "a == b", replace: "a === b", severity: "High", category: "c", explanation: "" },
  ]);
  assert.equal(result, "const x = a === b;");
  assert.equal(applied.length, 1);
  assert.equal(skipped.length, 0);
});

test("skips an ambiguous edit that occurs more than once", () => {
  const { result, applied, skipped } = applyEdits("foo; foo;", [
    { find: "foo", replace: "bar", severity: "Low", category: "c", explanation: "" },
  ]);
  assert.equal(result, "foo; foo;");
  assert.equal(applied.length, 0);
  assert.equal(skipped.length, 1);
});

test("skips an edit whose find snippet is absent", () => {
  const { applied, skipped } = applyEdits("abc", [
    { find: "xyz", replace: "q", severity: "Low", category: "c", explanation: "" },
  ]);
  assert.equal(applied.length, 0);
  assert.equal(skipped.length, 1);
});

