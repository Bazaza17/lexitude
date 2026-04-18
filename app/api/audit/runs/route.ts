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
  reviewResult?: unknown;
};

function pickScoreAndRisk(
  reviewResult: unknown,
  riskResult: unknown,
  codeResult: unknown,
  policyResult: unknown,
): { score: number | null; level: RiskLevel | null } {
  // Prefer the reviewer's adjusted verdict, then the risk synthesis, then
  // fall back to whichever module result is available.
  const candidates: Record<string, unknown>[] = [];
  const push = (v: unknown) => {
    if (v && typeof v === "object") candidates.push(v as Record<string, unknown>);
  };
  push(reviewResult);
  push(riskResult);
  push(codeResult);
  push(policyResult);

  for (const c of candidates) {
    const score =
      typeof c.adjustedScore === "number"
        ? c.adjustedScore
        : typeof c.overallScore === "number"
          ? c.overallScore
          : typeof c.score === "number"
            ? c.score
            : null;
    const level =
      typeof c.adjustedRiskLevel === "string" &&
      ["low", "medium", "high", "critical"].includes(c.adjustedRiskLevel)
        ? (c.adjustedRiskLevel as RiskLevel)
        : typeof c.riskLevel === "string" &&
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
      body.reviewResult,
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
        review_result: body.reviewResult ?? null,
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
      Math.max(Number(searchParams.get("limit") ?? "50"), 1),
      100,
    );
    // archive=active|archived|all. Default: active.
    const archiveParam = (searchParams.get("archive") ?? "active").toLowerCase();
    const archiveFilter: "active" | "archived" | "all" =
      archiveParam === "archived" || archiveParam === "all"
        ? archiveParam
        : "active";

    const supabase = getSupabase();

    // Run the list query and a count of the opposite bucket in parallel so
    // the UI can show a live "Archive (N)" badge without a second round-trip.
    const listSelect =
      "id, created_at, company_name, framework, overall_score, risk_level, file_count, doc_count, archived_at";

    let listQuery = supabase
      .from("audit_runs")
      .select(listSelect)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (archiveFilter === "active") listQuery = listQuery.is("archived_at", null);
    if (archiveFilter === "archived") listQuery = listQuery.not("archived_at", "is", null);

    const [listRes, archivedCountRes, activeCountRes] = await Promise.all([
      listQuery,
      supabase
        .from("audit_runs")
        .select("id", { count: "exact", head: true })
        .not("archived_at", "is", null),
      supabase
        .from("audit_runs")
        .select("id", { count: "exact", head: true })
        .is("archived_at", null),
    ]);

    if (listRes.error) {
      return Response.json({ error: listRes.error.message }, { status: 500 });
    }

    return Response.json({
      runs: listRes.data,
      counts: {
        archived: archivedCountRes.count ?? 0,
        active: activeCountRes.count ?? 0,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
