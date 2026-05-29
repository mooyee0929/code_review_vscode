const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyRepoType, summarizeLanguages } = require("../out/repoScan.js");

test("detects TypeScript Node project", () => {
  assert.equal(
    classifyRepoType(["package.json", "tsconfig.json", "src/extension.ts"]),
    "Node.js / TypeScript",
  );
});

test("detects plain JavaScript Node project", () => {
  assert.equal(classifyRepoType(["package.json", "index.js"]), "Node.js / JavaScript");
});

test("detects Python by manifest or extension", () => {
  assert.equal(classifyRepoType(["pyproject.toml"]), "Python");
  assert.equal(classifyRepoType(["app/main.py"]), "Python");
});

test("reports mixed repos in detection order", () => {
  assert.equal(classifyRepoType(["Cargo.toml", "go.mod"]), "Mixed (Rust, Go)");
});

test("falls back to Unknown", () => {
  assert.equal(classifyRepoType(["LICENSE", "notes.txt"]), "Unknown");
});

test("summarizes top languages by extension count", () => {
  const summary = summarizeLanguages(["a.ts", "b.ts", "c.py", "Makefile"]);
  assert.match(summary, /\.ts \(2\)/);
  assert.match(summary, /\.py \(1\)/);
});
