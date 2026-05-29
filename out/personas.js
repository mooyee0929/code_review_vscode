"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PERSONA_KEY = exports.PERSONAS = void 0;
exports.resolvePersona = resolvePersona;
exports.PERSONAS = [
    {
        key: "senior-engineer",
        label: "Senior engineer",
        preamble: "You are a senior software engineer with high standards for correctness, clarity, and long-term maintainability.",
    },
    {
        key: "coding-agent",
        label: "LLM coding agent",
        preamble: "You are an LLM agent that is excellent at coding. You review pragmatically and propose precise, minimal fixes.",
    },
    {
        key: "pragmatic",
        label: "Pragmatic (real bugs only)",
        preamble: "You are a pragmatic reviewer. Flag only real bugs and risks that matter; ignore style nitpicks.",
    },
    {
        key: "strict",
        label: "Strict (pedantic)",
        preamble: "You are a strict, detail-oriented reviewer. Flag edge cases, error-handling gaps, and inconsistencies, not just obvious bugs.",
    },
];
exports.DEFAULT_PERSONA_KEY = "senior-engineer";
function defaultPreamble() {
    const fallback = exports.PERSONAS.find((p) => p.key === exports.DEFAULT_PERSONA_KEY);
    return fallback ? fallback.preamble : exports.PERSONAS[0].preamble;
}
// Maps a configured value to a persona preamble: a known preset key resolves
// to its preamble; any other non-empty string is treated as a custom standard
// verbatim; empty falls back to the default persona.
function resolvePersona(value) {
    const trimmed = value.trim();
    const preset = exports.PERSONAS.find((p) => p.key === trimmed);
    if (preset) {
        return preset.preamble;
    }
    return trimmed.length > 0 ? trimmed : defaultPreamble();
}
//# sourceMappingURL=personas.js.map