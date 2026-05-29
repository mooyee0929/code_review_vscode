const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PERSONAS,
  DEFAULT_PERSONA_KEY,
  resolvePersona,
} = require("../out/personas.js");

test("resolves a known preset key to its preamble", () => {
  const senior = PERSONAS.find((p) => p.key === "senior-engineer");
  assert.equal(resolvePersona("senior-engineer"), senior.preamble);
});

test("treats unknown non-empty text as a custom standard verbatim", () => {
  assert.equal(
    resolvePersona("You are a kernel hacker"),
    "You are a kernel hacker",
  );
});

test("falls back to the default persona on empty input", () => {
  const fallback = PERSONAS.find((p) => p.key === DEFAULT_PERSONA_KEY);
  assert.equal(resolvePersona("   "), fallback.preamble);
});
