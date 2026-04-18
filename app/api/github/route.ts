import { NextRequest } from "next/server";
import { fetchRepo } from "@/lib/github";

export const runtime = "nodejs";
// GitHub ingest does ~1 tree call + N parallel blob fetches. Without a
// maxDuration override, Vercel Hobby defaults the function to 10s. Cold-
// boot + 100 unauthenticated blob fetches regularly overruns that, and
// when Vercel kills the function it returns its default HTML error page
// — which makes the client's `.json()` blow up with
// `Unexpected token '<', "<!DOCTYPE "...`. 60s is the Hobby ceiling and
// is plenty for any audit-sized repo.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { repoUrl, token, selectedPaths, branch, maxFiles, maxFileBytes } = body ?? {};

    if (!repoUrl || typeof repoUrl !== "string") {
      return Response.json({ error: "repoUrl is required" }, { status: 400 });
    }

    // Fail fast with a clear JSON error if the deploy is missing a token.
    // Without one, GitHub rate-limits to 60 req/hr per IP — fine locally,
    // lethal under Vercel's shared IP pool. We'd rather tell the user
    // "server is missing GITHUB_TOKEN" than let them watch a rate-limited
    // fetch stream back a cryptic 403.
    const effectiveToken = token || process.env.GITHUB_TOKEN;
    if (!effectiveToken) {
      return Response.json(
        {
          error:
            "Server is missing GITHUB_TOKEN. Add it in Vercel → Project → Settings → Environment Variables and redeploy.",
        },
        { status: 500 },
      );
    }

    const result = await fetchRepo({
      repoUrl,
      token: effectiveToken,
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
