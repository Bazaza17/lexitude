import { NextRequest } from "next/server";
import { getAnthropic, AUDIT_MODEL } from "@/lib/anthropic";
import { createAuditStream, extractJsonBlock } from "@/lib/sse";
import { riskSynthesisSystemPrompt, type Framework } from "@/lib/audit-prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

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

Stream short commentary as you cross-reference, then emit the final JSON block.`;

    let full = "";

    const stream = client.messages.stream({
      model: AUDIT_MODEL,
      max_tokens: 6000,
      system: [
        {
          type: "text",
          text: system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMsg }],
    });

    send({ type: "status", phase: "synthesizing" });

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
      send({ type: "error", message: "Could not parse final JSON block from model output." });
      return;
    }

    send({ type: "result", payload: parsed });
    send({ type: "status", phase: "done" });
  });
}
