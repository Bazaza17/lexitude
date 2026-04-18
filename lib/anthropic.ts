import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

// Model strategy per module:
// - Code compliance: Haiku 4.5 — cheap and fast for structured scanning across many files
// - Policy intelligence: Haiku 4.5 — short policy docs against a rigid schema;
//   Sonnet's extra nuance wasn't buying enough to justify the ~3x latency in
//   a live demo. Policy docs are typically <30kb and the JSON shape is strict.
// - Risk synthesis: Opus 4.7 with adaptive thinking — cross-cutting reasoning
//   (the one module where extended thinking earns its keep)
// - Reviewer / critic pass: Haiku 4.5 — second-opinion calibration on already-
//   structured findings. Sonnet-with-thinking was the slowest module in the
//   pipeline; Haiku hits the same calibration targets in a fraction of the time.
export const CODE_MODEL = "claude-haiku-4-5";
export const POLICY_MODEL = "claude-haiku-4-5";
export const RISK_MODEL = "claude-opus-4-7";
export const REVIEW_MODEL = "claude-haiku-4-5";

// Back-compat alias, not used by new code.
export const AUDIT_MODEL = POLICY_MODEL;
