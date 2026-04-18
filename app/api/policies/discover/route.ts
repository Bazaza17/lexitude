import { NextRequest } from "next/server";
import { discoverPolicies } from "@/lib/ingest/policy-discovery";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { repoUrl, token, branch } = body ?? {};

    if (!repoUrl || typeof repoUrl !== "string") {
      return Response.json({ error: "repoUrl is required" }, { status: 400 });
    }

    const result = await discoverPolicies({ repoUrl, token, branch });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 400 });
  }
}
