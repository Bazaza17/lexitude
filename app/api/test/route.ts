import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [{ role: "user", content: "Say: API is working." }],
  });
  return Response.json({ message: message.content[0] });
}
