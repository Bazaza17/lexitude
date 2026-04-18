import { NextRequest } from "next/server";
import { getAnthropic, CODE_MODEL } from "@/lib/audit/anthropic";
import { createAuditStream, extractJsonBlock } from "@/lib/stream/server";
import { codeAuditSystemPrompt, type Framework } from "@/lib/audit/prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

type RepoFile = { path: string; content: string; language?: string };

const FRAMEWORKS: Framework[] = ["SOC2", "GDPR", "HIPAA", "ISO27001", "PCIDSS"];
const MAX_TOTAL_CHARS = 250_000;

function renderFiles(files: RepoFile[]): { text: string; truncated: boolean; included: number } {
  let total = 0;
  const parts: string[] = [];
  let included = 0;
  // Sort files by path for deterministic cache key across runs on the same repo.
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  for (const f of sorted) {
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

    // Two-part user message: the deterministic code bundle (cached) comes FIRST,
    // then the per-run instructions (not cached) come SECOND. That keeps the
    // expensive bundle prefix stable across reruns on the same repo.
    const bundleBlock = `Repository bundle for ${framework} compliance audit.
Files included: ${included}${truncated ? " (truncated to fit budget)" : ""}
${codeBundle}`;

    const instructionBlock = `Company: ${companyName}

Audit the code bundle above for ${framework} compliance exposure. Stream commentary as you analyze each file, then emit the final JSON block per the schema in the system prompt.`;

    let full = "";

    const stream = client.messages.stream({
      model: CODE_MODEL,
      // 16000 gives headroom for repos with lots of findings (e.g. FinovaBank
      // routinely produces 50+ findings × multi-line recommendations). Haiku
      // 4.5 ceiling is 64k output tokens so this stays well inside.
      max_tokens: 16000,
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
              // Second breakpoint — caches the large, deterministic file bundle
              // so re-runs on the same repo hit the cache.
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
      console.error("[code] JSON parse failed", {
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
