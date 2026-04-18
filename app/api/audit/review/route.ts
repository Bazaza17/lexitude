import { NextRequest } from "next/server";
import { getAnthropic, REVIEW_MODEL } from "@/lib/anthropic";
import { createAuditStream, extractJsonBlock } from "@/lib/sse";
import { reviewerSystemPrompt, type Framework } from "@/lib/audit-prompts";
import type { CodeResult, PolicyResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

const FRAMEWORKS: Framework[] = ["SOC2", "GDPR", "HIPAA", "ISO27001", "PCIDSS"];
const MAX_PAYLOAD_CHARS = 40_000;

function clip(obj: unknown, max: number): string {
  const s = JSON.stringify(obj ?? null, null, 2);
  return s.length > max ? s.slice(0, max) + "\n/* ...truncated for length */" : s;
}

// Review only needs the raw findings + the scores to anchor its calibration.
// Strip the summary/stats prose — Sonnet spends noticeable time chewing on it
// and it isn't load-bearing for a calibration pass.
function trimCodeForReview(r: unknown): object | null {
  if (!r || typeof r !== "object") return null;
  const c = r as Partial<CodeResult>;
  return {
    score: c.score,
    riskLevel: c.riskLevel,
    findings: c.findings ?? [],
  };
}

function trimPolicyForReview(r: unknown): object | null {
  if (!r || typeof r !== "object") return null;
  const p = r as Partial<PolicyResult>;
  return {
    score: p.score,
    riskLevel: p.riskLevel,
    conflicts: p.conflicts ?? [],
    gaps: p.gaps ?? [],
    codeVsPolicyConflicts: p.codeVsPolicyConflicts ?? [],
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const framework: Framework = FRAMEWORKS.includes(body?.framework)
    ? body.framework
    : "SOC2";
  const companyName: string =
    typeof body?.companyName === "string" ? body.companyName : "the company";
  const codeResult = body?.codeResult ?? null;
  const policyResult = body?.policyResult ?? null;

  if (!codeResult && !policyResult) {
    return Response.json(
      { error: "At least one of codeResult/policyResult is required" },
      { status: 400 },
    );
  }

  return createAuditStream(async (send) => {
    send({ type: "status", phase: "starting" });

    const client = getAnthropic();
    const system = reviewerSystemPrompt(framework);

    const userMsg = `Company: ${companyName}
Framework: ${framework}

Two prior analysts produced the following audit payloads (findings + scores only; summaries and stats omitted — re-derive your verdict from the raw findings). Independently review them for hallucinations, severity miscalibrations, and missed cross-cutting risk. Be skeptical — do not rubber-stamp.

=== CODE AUDIT ===
\`\`\`json
${clip(trimCodeForReview(codeResult), MAX_PAYLOAD_CHARS)}
\`\`\`

=== POLICY AUDIT ===
\`\`\`json
${clip(trimPolicyForReview(policyResult), MAX_PAYLOAD_CHARS)}
\`\`\`

A separate risk synthesis is running in parallel — do not critique it here. Focus on calibrating the raw code and policy findings.

Stream short commentary as you reason, then emit the final JSON block.`;

    let full = "";

    const stream = client.messages.stream({
      model: REVIEW_MODEL,
      // Haiku 4.5 — the review/calibration pass. Sonnet-with-adaptive-thinking
      // was previously the slowest module; Haiku runs it in a fraction of the
      // time and is plenty capable for this pattern (structured input, rigid
      // output schema). Haiku doesn't accept `effort` or `thinking`, so
      // neither is set.
      max_tokens: 3500,
      system: [
        {
          type: "text",
          text: system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMsg }],
    });

    send({ type: "status", phase: "reviewing" });

    stream.on("text", (delta) => {
      full += delta;
      send({ type: "delta", text: delta });
    });

    const finalMessage = await stream.finalMessage();

    if (finalMessage.stop_reason === "max_tokens") {
      send({ type: "error", message: "Model hit max_tokens; result may be incomplete." });
    }

    const parsed = extractJsonBlock(full);
    if (!parsed || typeof parsed !== "object") {
      console.error("[review] JSON parse failed", {
        stopReason: finalMessage.stop_reason,
        length: full.length,
        tail: full.slice(-800),
      });
      send({
        type: "error",
        message: `Could not parse final JSON block from model output (stop_reason=${finalMessage.stop_reason}, length=${full.length}).`,
      });
      return;
    }

    send({ type: "result", payload: parsed });
    send({ type: "status", phase: "done" });
  });
}
