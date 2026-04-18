import { NextRequest } from "next/server";
import { getAnthropic, RISK_MODEL } from "@/lib/audit/anthropic";
import { createAuditStream, extractJsonBlock } from "@/lib/stream/server";
import { riskSynthesisSystemPrompt, type Framework } from "@/lib/audit/prompts";

export const runtime = "nodejs";
export const maxDuration = 180;

const FRAMEWORKS: Framework[] = ["SOC2", "GDPR", "HIPAA", "ISO27001", "PCIDSS"];
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

  if (!codeResult && !policyResult) {
    return Response.json(
      { error: "codeResult and/or policyResult are required" },
      { status: 400 },
    );
  }

  return createAuditStream(async (send) => {
    send({ type: "status", phase: "starting" });

    const client = getAnthropic();
    const system = riskSynthesisSystemPrompt(framework);

    const userMsg = `Company: ${companyName}
Framework: ${framework}

You are synthesizing two prior audits. Cross-reference them and surface what the company does not yet know about its own risk surface.

=== CODE AUDIT RESULT ===
\`\`\`json
${clip(codeResult, MAX_PAYLOAD_CHARS)}
\`\`\`

=== POLICY AUDIT RESULT ===
\`\`\`json
${clip(policyResult, MAX_PAYLOAD_CHARS)}
\`\`\`

Use extended thinking to reason about the interactions before you write. Then stream a short running commentary and emit the final JSON block.`;

    let full = "";

    const stream = client.messages.stream({
      model: RISK_MODEL,
      // 12000 leaves comfortable headroom even after the prompt caps topInsights
      // at 3 and priorityActions at 3 — protects against long adaptive thinking
      // runs that eat into the output budget. Opus 4.7 has ample ceiling here.
      max_tokens: 12000,
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

    send({ type: "status", phase: "thinking" });

    stream.on("text", (delta) => {
      full += delta;
      send({ type: "delta", text: delta });
    });

    // Opus 4.7 streams summarized thinking deltas as a separate content-block type.
    // Forward them so the UI can show a dedicated "reasoning" panel.
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
      console.error("[risk] JSON parse failed", {
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
