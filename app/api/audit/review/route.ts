import { NextRequest } from "next/server";
import { getAnthropic, REVIEW_MODEL } from "@/lib/anthropic";
import { createAuditStream, extractJsonBlock } from "@/lib/sse";
import { reviewerSystemPrompt, type Framework } from "@/lib/audit-prompts";

export const runtime = "nodejs";
export const maxDuration = 180;

const FRAMEWORKS: Framework[] = ["SOC2", "GDPR", "HIPAA"];
const MAX_PAYLOAD_CHARS = 60_000;

function clip(obj: unknown, max: number): string {
  const s = JSON.stringify(obj ?? null, null, 2);
  return s.length > max ? s.slice(0, max) + "\n/* ...truncated for length */" : s;
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
  const riskResult = body?.riskResult ?? null;

  if (!codeResult && !policyResult && !riskResult) {
    return Response.json(
      { error: "At least one of codeResult/policyResult/riskResult is required" },
      { status: 400 },
    );
  }

  return createAuditStream(async (send) => {
    send({ type: "status", phase: "starting" });

    const client = getAnthropic();
    const system = reviewerSystemPrompt(framework);

    const userMsg = `Company: ${companyName}
Framework: ${framework}

Three prior analysts produced the following audit payloads. Independently review them for hallucinations, severity miscalibrations, and missed cross-cutting risk. Be skeptical — do not rubber-stamp.

=== CODE AUDIT ===
\`\`\`json
${clip(codeResult, MAX_PAYLOAD_CHARS)}
\`\`\`

=== POLICY AUDIT ===
\`\`\`json
${clip(policyResult, MAX_PAYLOAD_CHARS)}
\`\`\`

=== RISK SYNTHESIS ===
\`\`\`json
${clip(riskResult, MAX_PAYLOAD_CHARS)}
\`\`\`

Use extended thinking to calibrate carefully. Stream short commentary as you reason, then emit the final JSON block.`;

    let full = "";

    const stream = client.messages.stream({
      model: REVIEW_MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive", display: "summarized" },
      output_config: { effort: "medium" },
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

    stream.on("streamEvent", (event) => {
      if (
        event.type === "content_block_delta" &&
        "delta" in event &&
        (event.delta as { type?: string })?.type === "thinking_delta"
      ) {
        const delta = event.delta as { thinking?: string };
        if (typeof delta.thinking === "string" && delta.thinking.length > 0) {
          send({ type: "thinking", text: delta.thinking });
        }
      }
    });

    const finalMessage = await stream.finalMessage();

    if (finalMessage.stop_reason === "max_tokens") {
      send({ type: "error", message: "Model hit max_tokens; result may be incomplete." });
    }

    const parsed = extractJsonBlock(full);
    if (!parsed || typeof parsed !== "object") {
      send({ type: "error", message: "Could not parse final JSON block from model output." });
      return;
    }

    send({ type: "result", payload: parsed });
    send({ type: "status", phase: "done" });
  });
}
