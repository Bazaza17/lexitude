import { NextRequest } from "next/server";
import { getAnthropic, POLICY_MODEL } from "@/lib/anthropic";
import { createAuditStream, extractJsonBlock } from "@/lib/sse";
import {
  policyAuditNoDocsSystemPrompt,
  policyAuditSystemPrompt,
  type Framework,
} from "@/lib/audit-prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

type PolicyDoc = { filename: string; chunks: string[]; charCount?: number };

const FRAMEWORKS: Framework[] = ["SOC2", "GDPR", "HIPAA", "ISO27001", "PCIDSS"];
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

  const noDocsMode = docs.length === 0;
  const { text: docBundle, truncated, included } = noDocsMode
    ? { text: "", truncated: false, included: 0 }
    : renderDocs(docs);

  return createAuditStream(async (send) => {
    send({ type: "status", phase: noDocsMode ? "inferring-required-policies" : "starting" });

    const client = getAnthropic();
    const system = noDocsMode
      ? policyAuditNoDocsSystemPrompt(framework)
      : policyAuditSystemPrompt(framework);

    const codeFindingsBlock = codeFindings
      ? `\n\nCode findings from a concurrent module (use to justify and prioritize required policies):\n\`\`\`json\n${JSON.stringify(codeFindings, null, 2).slice(0, 40_000)}\n\`\`\``
      : "\n\nNo code findings available — base the gap list on framework requirements alone.";

    // In no-docs mode the user message only describes the situation; the
    // framework requirements live in the system prompt. In docs mode we
    // include the document bundle as a cache_control-marked block so the
    // per-run variable content (instruction + code findings) sits after.
    const messages = noDocsMode
      ? [
          {
            role: "user" as const,
            content: [
              {
                type: "text" as const,
                text: `Company: ${companyName}

No policy documents were provided. Produce the ${framework} gap report described in the system prompt — every required policy this company needs, with code evidence where available, and matching \`codeVsPolicyConflicts\` entries for every meaningful code finding.${codeFindingsBlock}`,
              },
            ],
          },
        ]
      : [
          {
            role: "user" as const,
            content: [
              {
                type: "text" as const,
                text: `Policy document bundle for ${framework} audit.
Documents included: ${included}${truncated ? " (truncated to fit budget)" : ""}
${docBundle}`,
                cache_control: { type: "ephemeral" as const },
              },
              {
                type: "text" as const,
                text: `Company: ${companyName}

Audit the policy documents above for ${framework} compliance. Stream commentary as you analyze each document, then emit the final JSON block.${codeFindingsBlock}`,
              },
            ],
          },
        ];

    let full = "";

    const stream = client.messages.stream({
      model: POLICY_MODEL,
      // 8000 keeps room for ~2-3 dense policy docs + the full cross-reference
      // table without truncating mid-JSON. 5000 was cutting it too close and
      // stop_reason came back "end_turn" with malformed trailing JSON.
      max_tokens: 8000,
      output_config: { effort: "medium" },
      system: [
        {
          type: "text",
          text: system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
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
      // Log the tail of the model output so we can diagnose whether the
      // model truncated mid-JSON, never emitted a fence, or produced an
      // unexpected shape. Visible in `next dev` stdout.
      console.error("[policy] JSON parse failed", {
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
