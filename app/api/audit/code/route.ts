import { NextRequest } from "next/server";
import { getAnthropic, AUDIT_MODEL } from "@/lib/anthropic";
import { createAuditStream, extractJsonBlock } from "@/lib/sse";
import { codeAuditSystemPrompt, type Framework } from "@/lib/audit-prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

type RepoFile = { path: string; content: string; language?: string };

const FRAMEWORKS: Framework[] = ["SOC2", "GDPR", "HIPAA"];
const MAX_TOTAL_CHARS = 250_000;

function renderFiles(files: RepoFile[]): { text: string; truncated: boolean; included: number } {
  let total = 0;
  const parts: string[] = [];
  let included = 0;
  for (const f of files) {
    const header = `\n\n===== FILE: ${f.path} (${f.language ?? "text"}) =====\n`;
    const body = f.content ?? "";
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
  const files: RepoFile[] = Array.isArray(body?.files) ? body.files : [];
  const framework: Framework = FRAMEWORKS.includes(body?.framework)
    ? body.framework
    : "SOC2";
  const companyName: string = typeof body?.companyName === "string" ? body.companyName : "the company";

  if (files.length === 0) {
    return Response.json({ error: "files[] is required" }, { status: 400 });
  }

  const { text: codeBundle, truncated, included } = renderFiles(files);

  return createAuditStream(async (send) => {
    send({ type: "status", phase: "starting" });

    const client = getAnthropic();
    const system = codeAuditSystemPrompt(framework);

    const userMsg = `Company: ${companyName}
Framework: ${framework}
Files included in this audit: ${included}${truncated ? " (input was truncated to fit budget)" : ""}

Audit the following code bundle for ${framework} compliance exposure. Stream commentary as you analyze each file, then emit the final JSON block.
${codeBundle}`;

    let full = "";

    const stream = client.messages.stream({
      model: AUDIT_MODEL,
      max_tokens: 8000,
      system: [
        {
          type: "text",
          text: system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMsg }],
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
