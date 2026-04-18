export function chunkText(text: string, maxChars = 4000, overlap = 200): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length <= maxChars) return normalized ? [normalized] : [];

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < normalized.length) {
    const end = Math.min(cursor + maxChars, normalized.length);
    let slice = normalized.slice(cursor, end);

    if (end < normalized.length) {
      const breakPoints = ["\n\n", "\n", ". ", " "];
      for (const bp of breakPoints) {
        const idx = slice.lastIndexOf(bp);
        if (idx > maxChars * 0.5) {
          slice = slice.slice(0, idx + bp.length);
          break;
        }
      }
    }

    chunks.push(slice.trim());
    cursor += slice.length - overlap;
    if (cursor <= 0) cursor = slice.length;
  }
  return chunks.filter((c) => c.length > 0);
}
