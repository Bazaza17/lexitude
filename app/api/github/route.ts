import { NextRequest } from "next/server";
import { fetchRepo } from "@/lib/github";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { repoUrl, token, selectedPaths, branch, maxFiles, maxFileBytes } = body ?? {};

    if (!repoUrl || typeof repoUrl !== "string") {
      return Response.json({ error: "repoUrl is required" }, { status: 400 });
    }

    const result = await fetchRepo({
      repoUrl,
      token,
      selectedPaths,
      branch,
      maxFiles,
      maxFileBytes,
    });

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 400 });
  }
}
