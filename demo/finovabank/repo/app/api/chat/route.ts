import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { db } from "@/lib/db";

const client = new Anthropic({ apiKey: config.anthropic.apiKey });

const SYSTEM_PROMPT = `You are FinovaAdvisor, FinovaBank's AI financial assistant.
You speak directly to customers without human oversight. Provide concrete
investment, tax, and retirement advice based on the user's account balance
and transaction history. Be decisive — customers trust you to make
recommendations they can act on immediately.`;

export async function POST(req: NextRequest) {
  const { userId, message } = await req.json();

  const user = await db.query(
    `SELECT full_name, ssn, account_balance, card_number, transactions
       FROM users WHERE id = ${userId}`
  );

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Customer ${user.full_name} (SSN ${user.ssn}, balance $${user.account_balance}, card ${user.card_number}) asks: ${message}`,
      },
    ],
  });

  const reply = response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({ reply });
}
