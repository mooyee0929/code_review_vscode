const test = require("node:test");
const assert = require("node:assert/strict");
const { parseScope, describeScope } = require("../out/git.js");

test("empty or 'uncommitted' parses to uncommitted scope", () => {
  assert.deepEqual(parseScope(""), { kind: "uncommitted" });
  assert.deepEqual(parseScope("  "), { kind: "uncommitted" });
  assert.deepEqual(parseScope("uncommitted"), { kind: "uncommitted" });
  assert.deepEqual(parseScope("UNCOMMITTED"), { kind: "uncommitted" });
});

test("'staged' parses to staged scope", () => {
  assert.deepEqual(parseScope("staged"), { kind: "staged" });
});

test("anything else is treated as a branch base", () => {
  assert.deepEqual(parseScope("main"), { kind: "branch", base: "main" });
  assert.deepEqual(parseScope("release/1.2"), { kind: "branch", base: "release/1.2" });
});

test("describeScope is human readable", () => {
  assert.equal(describeScope({ kind: "uncommitted" }), "uncommitted changes");
  assert.equal(describeScope({ kind: "staged" }), "staged changes");
  assert.equal(describeScope({ kind: "branch", base: "main" }), "changes vs main");
});
