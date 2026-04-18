import { NextRequest } from "next/server";
import { getAnthropic, POLICY_MODEL } from "@/lib/audit/anthropic";
import { createAuditStream } from "@/lib/stream/server";
import { policyDraftSystemPrompt, type Framework } from "@/lib/audit/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const FRAMEWORKS: Framework[] = ["SOC2", "GDPR", "HIPAA", "ISO27001", "PCIDSS"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const framework: Framework = FRAMEWORKS.includes(body?.framework)
    ? body.framework
    : "SOC2";
  const companyName: string =
    typeof body?.companyName === "string" && body.companyName.trim()
      ? body.companyName.trim()
      : "the company";
  const requirement: string =
    typeof body?.requirement === "string" ? body.requirement.trim() : "";
  const controlId: string | null =
    typeof body?.controlId === "string" && body.controlId.trim()
      ? body.controlId.trim()
      : null;
  const severity: string =
    typeof body?.severity === "string" ? body.severity : "medium";
  const issue: string =
    typeof body?.issue === "string" ? body.issue.trim() : "";
  const recommendation: string =
    typeof body?.recommendation === "string" ? body.recommendation.trim() : "";

  if (!requirement) {
    return Response.json(
      { error: "requirement is required" },
      { status: 400 },
    );
  }

  return createAuditStream(async (send) => {
    send({ type: "status", phase: "starting" });

    const client = getAnthropic();
    const system = policyDraftSystemPrompt(framework);

    const userMsg = `Company: ${companyName}
Framework: ${framework}
Control reference: ${controlId ?? "(none supplied — infer the nearest applicable control)"}
Severity assigned by prior audit: ${severity}

Identified gap / requirement:
${requirement}

Auditor's note on why this is a gap:
${issue || "(no extra context beyond the requirement line)"}

Auditor's recommendation to close the gap:
${recommendation || "(no explicit recommendation; infer from the requirement)"}

Draft the policy section that closes this gap. Follow the required Markdown structure exactly. Stream the Markdown directly as plain text — do not wrap in a code fence, do not emit a JSON block at the end.`;

    const stream = client.messages.stream({
      model: POLICY_MODEL, // Sonnet 4.6 — nuanced prose for legal drafting
      max_tokens: 5000,
      system: [
        {
          type: "text",
          text: system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMsg }],
    });

    send({ type: "status", phase: "drafting" });

    let full = "";
    stream.on("text", (delta) => {
      full += delta;
      send({ type: "delta", text: delta });
    });

    const finalMessage = await stream.finalMessage();

    if (finalMessage.stop_reason === "max_tokens") {
      send({
        type: "error",
        message: "Draft hit max_tokens; may be truncated.",
      });
    }

    send({ type: "result", payload: { markdown: full } });
    send({ type: "status", phase: "done" });
  });
}
