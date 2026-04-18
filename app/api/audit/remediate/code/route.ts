import { NextRequest } from "next/server";
import { getAnthropic, CODE_MODEL } from "@/lib/anthropic";
import { createAuditStream } from "@/lib/sse";
import { codeFixSystemPrompt, type Framework } from "@/lib/audit-prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const FRAMEWORKS: Framework[] = ["SOC2", "GDPR", "HIPAA", "ISO27001", "PCIDSS"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const framework: Framework = FRAMEWORKS.includes(body?.framework)
    ? body.framework
    : "SOC2";
  const file: string = typeof body?.file === "string" ? body.file.trim() : "";
  const line =
    typeof body?.line === "number" && Number.isFinite(body.line)
      ? Math.trunc(body.line)
      : null;
  const severity: string =
    typeof body?.severity === "string" ? body.severity : "medium";
  const category: string =
    typeof body?.category === "string" ? body.category : "other";
  const controlId: string | null =
    typeof body?.controlId === "string" && body.controlId.trim()
      ? body.controlId.trim()
      : null;
  const issue: string = typeof body?.issue === "string" ? body.issue.trim() : "";
  const recommendation: string =
    typeof body?.recommendation === "string" ? body.recommendation.trim() : "";

  if (!file || !issue) {
    return Response.json(
      { error: "file and issue are required" },
      { status: 400 },
    );
  }

  return createAuditStream(async (send) => {
    send({ type: "status", phase: "starting" });

    const client = getAnthropic();
    const system = codeFixSystemPrompt(framework);

    const userMsg = `Finding to remediate:

File: ${file}${line ? `:${line}` : ""}
${framework} control: ${controlId ?? "(none — infer nearest)"}
Severity: ${severity}
Category: ${category}

Issue (from upstream auditor):
${issue}

Recommendation (from upstream auditor):
${recommendation || "(no explicit recommendation — infer from issue)"}

Write the PR-ready fix guide in the required Markdown structure. Stream the Markdown directly.`;

    const stream = client.messages.stream({
      model: CODE_MODEL, // Haiku 4.5 — fast and cheap for mechanical per-finding remediation
      max_tokens: 2500,
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
        message: "Fix guide hit max_tokens; may be truncated.",
      });
    }

    send({ type: "result", payload: { markdown: full } });
    send({ type: "status", phase: "done" });
  });
}
