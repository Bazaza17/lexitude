// IMPORTANT: do NOT `import` pdf-parse at the top level. pdf-parse@2.x
// runs debug-mode side effects at module load (it tries to read a test
// PDF from its own package directory), which crashes with ENOENT on
// Vercel's serverless bundler and takes the whole route down with a
// generic 500 — before our route handler ever runs. Keep it inside the
// function so it only loads when a PDF actually needs to be parsed.
export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return (result.text ?? "").trim();
  } finally {
    await parser.destroy();
  }
}

export function looksLikePdf(name: string, mime: string | undefined): boolean {
  if (mime && mime.toLowerCase().includes("pdf")) return true;
  return name.toLowerCase().endsWith(".pdf");
}
