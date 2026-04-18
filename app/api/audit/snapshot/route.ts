import { NextRequest } from "next/server";
import { getAnthropic, CODE_MODEL } from "@/lib/audit/anthropic";
import { createAuditStream, extractJsonBlock } from "@/lib/stream/server";
import { repoSnapshotSystemPrompt, type Framework } from "@/lib/audit/prompts";

export const runtime = "nodejs";
export const maxDuration = 45;

type RepoFile = { path: string; content: string; language?: string };

const FRAMEWORKS: Framework[] = ["SOC2", "GDPR", "HIPAA", "ISO27001", "PCIDSS"];
const MAX_PKG_CHARS = 6_000;
const MAX_README_CHARS = 4_000;
const MAX_TREE_ENTRIES = 250;

function pickFirst(files: RepoFile[], name: string): RepoFile | undefined {
  const lower = name.toLowerCase();
  return files.find(
    (f) => f.path.toLowerCase() === lower || f.path.toLowerCase().endsWith("/" + lower),
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const files: RepoFile[] = Array.isArray(body?.files) ? body.files : [];
  const framework: Framework = FRAMEWORKS.includes(body?.framework)
    ? body.framework
    : "SOC2";
  const companyName: string =
    typeof body?.companyName === "string" ? body.companyName : "the company";

  if (files.length === 0) {
    return Response.json({ error: "files[] is required" }, { status: 400 });
  }

  // Lightweight payload: just paths + languages, plus the raw text of
  // package.json and README.md if we have them. Full bundle stays out of this
  // call — the whole point is to be fast enough to beat the main audit.
  const tree = [...files]
    .sort((a, b) => a.path.localeCompare(b.path))
    .slice(0, MAX_TREE_ENTRIES)
    .map((f) => `${f.path}${f.language ? ` (${f.language})` : ""}`)
    .join("\n");

  const pkg = pickFirst(files, "package.json");
  const readme = pickFirst(files, "README.md") ?? pickFirst(files, "readme.md");

  const pkgBlock = pkg
    ? `\n\n===== package.json =====\n${pkg.content.slice(0, MAX_PKG_CHARS)}`
    : "";
  const readmeBlock = readme
    ? `\n\n===== README =====\n${readme.content.slice(0, MAX_README_CHARS)}`
    : "";

  return createAuditStream(async (send) => {
    send({ type: "status", phase: "starting" });

    const client = getAnthropic();
    const system = repoSnapshotSystemPrompt(framework);

    const userMsg = `Company: ${companyName}
Framework: ${framework}
Total files in repository: ${files.length}${files.length > MAX_TREE_ENTRIES ? ` (showing first ${MAX_TREE_ENTRIES})` : ""}

===== FILE TREE =====
${tree}${pkgBlock}${readmeBlock}

Give a fast first impression — stream ~4-6 lines of commentary then emit the JSON block.`;

    let full = "";

    const stream = client.messages.stream({
      model: CODE_MODEL, // Haiku 4.5 — this is the fast path
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMsg }],
    });

    send({ type: "status", phase: "scanning" });

    stream.on("text", (delta) => {
      full += delta;
      send({ type: "delta", text: delta });
    });

    const finalMessage = await stream.finalMessage();

    if (finalMessage.stop_reason === "max_tokens") {
      send({ type: "error", message: "Snapshot hit max_tokens." });
    }

    const parsed = extractJsonBlock(full);
    if (!parsed || typeof parsed !== "object") {
      send({ type: "error", message: "Could not parse snapshot JSON block." });
      return;
    }

    send({ type: "result", payload: parsed });
    send({ type: "status", phase: "done" });
  });
}
