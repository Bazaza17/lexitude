import { PDFParse } from "pdf-parse";

export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
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
