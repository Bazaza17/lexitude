import type { AuditStreamEvent } from "./types";

// Re-export so existing `import { AuditStreamEvent } from "@/lib/stream-client"`
// call sites keep working. The canonical definition lives in lib/types.ts so
// the server producer and this browser consumer share it.
export type { AuditStreamEvent };

export async function consumeNdjsonStream(
  response: Response,
  onEvent: (ev: AuditStreamEvent) => void,
): Promise<void> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Request failed: ${response.status}${text ? ` — ${text.slice(0, 200)}` : ""}`,
    );
  }
  const body = response.body;
  if (!body) throw new Error("Response has no body");
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        onEvent(JSON.parse(line) as AuditStreamEvent);
      } catch {
        // ignore malformed lines
      }
    }
  }
  const tail = buffer.trim();
  if (tail) {
    try {
      onEvent(JSON.parse(tail) as AuditStreamEvent);
    } catch {
      // ignore
    }
  }
}
