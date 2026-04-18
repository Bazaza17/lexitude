import { NextRequest } from "next/server";
import { getSupabase, type Framework, type RiskLevel } from "@/lib/supabase";

export const runtime = "nodejs";

type SaveBody = {
  companyName: string;
  framework: Framework;
  repoUrl?: string | null;
  repoBranch?: string | null;
  fileCount?: number | null;
  docCount?: number | null;
  codeResult?: unknown;
  policyResult?: unknown;
  riskResult?: unknown;
};

function pickScoreAndRisk(
  riskResult: unknown,
  codeResult: unknown,
  policyResult: unknown,
): { score: number | null; level: RiskLevel | null } {
  const candidates = [riskResult, codeResult, policyResult].filter(
    (v): v is Record<string, unknown> => !!v && typeof v === "object",
  );
  for (const c of candidates) {
    const score =
      typeof c.overallScore === "number"
        ? c.overallScore
        : typeof c.score === "number"
          ? c.score
          : null;
    const level =
      typeof c.riskLevel === "string" &&
      ["low", "medium", "high", "critical"].includes(c.riskLevel)
        ? (c.riskLevel as RiskLevel)
        : null;
    if (score !== null || level !== null) return { score, level };
  }
  return { score: null, level: null };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SaveBody;

    if (!body?.companyName || !body?.framework) {
      return Response.json(
        { error: "companyName and framework are required" },
        { status: 400 },
      );
    }

    const { score, level } = pickScoreAndRisk(
      body.riskResult,
      body.codeResult,
      body.policyResult,
    );

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("audit_runs")
      .insert({
        company_name: body.companyName,
        framework: body.framework,
        repo_url: body.repoUrl ?? null,
        repo_branch: body.repoBranch ?? null,
        file_count: body.fileCount ?? null,
        doc_count: body.docCount ?? null,
        code_result: body.codeResult ?? null,
        policy_result: body.policyResult ?? null,
        risk_result: body.riskResult ?? null,
        overall_score: score,
        risk_level: level,
      })
      .select("id, created_at")
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ id: data.id, createdAt: data.created_at });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") ?? "20"), 1),
      100,
    );

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("audit_runs")
      .select(
        "id, created_at, company_name, framework, overall_score, risk_level, file_count, doc_count",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ runs: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
