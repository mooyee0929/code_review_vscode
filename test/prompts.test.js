const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildReviewPrompt,
  buildSecurityPrompt,
  buildProjectDocPrompt,
} = require("../out/prompts.js");

const PERSONA = "You are a senior engineer who values correctness.";
const FILE = "src/app.ts";
const CONTENT = "const ok = a == b;\n";
const DIFF = "@@ -1,1 +1,1 @@\n+const ok = a == b;\n";

test("review prompt embeds persona, file path, content, diff, and JSON protocol", () => {
  const { system, user } = buildReviewPrompt(PERSONA, FILE, CONTENT, DIFF);
  assert.ok(system.startsWith(PERSONA));
  assert.ok(user.includes(FILE));
  assert.ok(user.includes(CONTENT));
  assert.ok(user.includes(DIFF));
  assert.match(system, /correctness/i);
  assert.match(system, /"edits"/);
  assert.match(system, /MUST NOT contain any comment/);
});

test("security prompt uses persona and references OWASP, injection, JSON edits", () => {
  const { system, user } = buildSecurityPrompt(PERSONA, FILE, CONTENT, DIFF);
  assert.ok(system.startsWith(PERSONA));
  assert.match(system, /OWASP/);
  assert.match(system, /[Ii]njection/);
  assert.match(system, /"edits"/);
  assert.ok(user.includes(CONTENT));
});

test("truncation note appears only when truncated", () => {
  assert.ok(!buildReviewPrompt(PERSONA, FILE, CONTENT, DIFF, false).user.includes("truncated"));
  assert.ok(buildReviewPrompt(PERSONA, FILE, CONTENT, DIFF, true).user.includes("truncated"));
});

test("project doc prompt embeds doc name, template, and digest", () => {
  const { system, user } = buildProjectDocPrompt(
    "README.md",
    "# <Project Name>\n## Usage\n",
    "Detected type: Node.js / TypeScript",
  );
  assert.match(system, /README\.md/);
  assert.match(system, /ONLY facts/);
  assert.ok(user.includes("## Usage"));
  assert.ok(user.includes("Detected type: Node.js / TypeScript"));
});
