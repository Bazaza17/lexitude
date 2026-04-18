import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

// Model strategy per module:
// - Code compliance: Haiku 4.5 — cheap and fast for structured scanning across many files
// - Policy intelligence: Sonnet 4.6 — nuanced reading of legal/policy prose
// - Risk synthesis: Opus 4.7 with adaptive thinking — cross-cutting reasoning
// - Reviewer / critic pass: Sonnet 4.6 with adaptive thinking — fast calibration
//   (Sonnet is plenty smart for a second-read check, and materially faster than Opus.)
export const CODE_MODEL = "claude-haiku-4-5";
export const POLICY_MODEL = "claude-sonnet-4-6";
export const RISK_MODEL = "claude-opus-4-7";
export const REVIEW_MODEL = "claude-sonnet-4-6";

// Back-compat alias, not used by new code.
export const AUDIT_MODEL = POLICY_MODEL;
