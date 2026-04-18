import { NextRequest } from "next/server";
import { chunkText } from "@/lib/chunk";
import { extractPdfText, looksLikePdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;

type DocOut = { filename: string; chunks: string[]; charCount: number };

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    const docs: DocOut[] = [];
    const warnings: string[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const entries = form.getAll("files");
      const textField = form.get("text");

      for (const entry of entries) {
        if (!(entry instanceof File)) continue;
        if (entry.size > MAX_BYTES) {
          warnings.push(`${entry.name}: exceeds 10MB, skipped`);
          continue;
        }
        const buf = await entry.arrayBuffer();
        let text: string;
        if (looksLikePdf(entry.name, entry.type)) {
          text = await extractPdfText(buf);
        } else {
          text = new TextDecoder().decode(buf);
        }
        docs.push({
          filename: entry.name,
          chunks: chunkText(text),
          charCount: text.length,
        });
      }

      if (typeof textField === "string" && textField.trim()) {
        docs.push({
          filename: "pasted.txt",
          chunks: chunkText(textField),
          charCount: textField.length,
        });
      }
    } else {
      const body = await req.json();
      const incoming = Array.isArray(body?.docs) ? body.docs : [];
      const pasted: string | undefined = body?.text;

      for (const d of incoming) {
        const text = typeof d?.text === "string" ? d.text : "";
        if (!text) continue;
        docs.push({
          filename: d.filename ?? "document.txt",
          chunks: chunkText(text),
          charCount: text.length,
        });
      }

      if (pasted && pasted.trim()) {
        docs.push({
          filename: "pasted.txt",
          chunks: chunkText(pasted),
          charCount: pasted.length,
        });
      }
    }

    if (docs.length === 0) {
      return Response.json(
        { error: "No documents or text provided" },
        { status: 400 },
      );
    }

    return Response.json({ docs, warnings });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 400 });
  }
}
