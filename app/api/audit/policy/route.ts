import { NextRequest } from "next/server";
import { getAnthropic, POLICY_MODEL } from "@/lib/anthropic";
import { createAuditStream, extractJsonBlock } from "@/lib/sse";
import { policyAuditSystemPrompt, type Framework } from "@/lib/audit-prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

type PolicyDoc = { filename: string; chunks: string[]; charCount?: number };

const FRAMEWORKS: Framework[] = ["SOC2", "GDPR", "HIPAA"];
const MAX_TOTAL_CHARS = 250_000;

function renderDocs(docs: PolicyDoc[]): { text: string; truncated: boolean; included: number } {
  let total = 0;
  const parts: string[] = [];
  let included = 0;
  const sorted = [...docs].sort((a, b) => a.filename.localeCompare(b.filename));
  for (const d of sorted) {
    const body = (d.chunks ?? []).join("\n\n");
    const header = `\n\n===== POLICY DOC: ${d.filename} =====\n`;
    const chunk = header + body;
    if (total + chunk.length > MAX_TOTAL_CHARS) {
      return { text: parts.join(""), truncated: true, included };
    }
    parts.push(chunk);
    total += chunk.length;
    included += 1;
  }
  return { text: parts.join(""), truncated: false, included };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const docs: PolicyDoc[] = Array.isArray(body?.docs) ? body.docs : [];
  const framework: Framework = FRAMEWORKS.includes(body?.framework)
    ? body.framework
    : "SOC2";
  const companyName: string =
    typeof body?.companyName === "string" ? body.companyName : "the company";
  const codeFindings: unknown = body?.codeFindings ?? null;

  if (docs.length === 0) {
    return Response.json({ error: "docs[] is required" }, { status: 400 });
  }

  const { text: docBundle, truncated, included } = renderDocs(docs);

  return createAuditStream(async (send) => {
    send({ type: "status", phase: "starting" });

    const client = getAnthropic();
    const system = policyAuditSystemPrompt(framework);

    const bundleBlock = `Policy document bundle for ${framework} audit.
Documents included: ${included}${truncated ? " (truncated to fit budget)" : ""}
${docBundle}`;

    const codeFindingsBlock = codeFindings
      ? `\n\nCode findings from a concurrent module (for cross-reference):\n\`\`\`json\n${JSON.stringify(codeFindings, null, 2).slice(0, 40_000)}\n\`\`\``
      : "\n\nNo code findings were provided; focus on internal conflicts and gaps.";

    const instructionBlock = `Company: ${companyName}

Audit the policy documents above for ${framework} compliance. Stream commentary as you analyze each document, then emit the final JSON block.${codeFindingsBlock}`;

    let full = "";

    const stream = client.messages.stream({
      model: POLICY_MODEL,
      max_tokens: 8000,
      system: [
        {
          type: "text",
          text: system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: bundleBlock,
              cache_control: { type: "ephemeral" },
            },
            { type: "text", text: instructionBlock },
          ],
        },
      ],
    });

    send({ type: "status", phase: "analyzing" });

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
