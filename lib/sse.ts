import type { AuditStreamEvent } from "./types";

// Re-export so existing `import { AuditStreamEvent } from "@/lib/sse"` call
// sites keep working. The canonical definition lives in lib/types.ts so the
// producer (this file) and the consumer (stream-client.ts) share it.
export type { AuditStreamEvent };

export function createAuditStream(
  producer: (send: (ev: AuditStreamEvent) => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (ev: AuditStreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
      };
      try {
        await producer(send);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export function extractJsonBlock(text: string): unknown | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {}
  }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {}
  }
  return null;
}
