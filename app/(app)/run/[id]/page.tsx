"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/app/AppHeader";
import { Sparkline } from "@/components/app/Sparkline";
import { useCountUp } from "@/lib/useCountUp";
import type {
  AuditRunRow,
  CodeFinding,
  PolicyConflict,
  PolicyGap,
  CodeVsPolicy,
  TopInsight,
  PriorityAction,
  ReviewResult,
  ReviewHallucination,
  ReviewMiscalibration,
  ReviewMissedRisk,
  ReviewActionNow,
  ReviewDefer,
  Severity,
} from "@/lib/types";

type Tab = "insights" | "code" | "policy" | "review";

export default function RunResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [run, setRun] = useState<AuditRunRow | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("insights");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/audit/runs/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to load run");
        setRun(json.run);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [id]);

  if (err) {
    return (
      <>
        <AppHeader title="Run unavailable" breadcrumb="Runs" />
        <div className="relative mx-auto w-full max-w-3xl px-6 py-16">
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {err}
          </div>
          <Link
            href="/new"
            className="mt-4 inline-block font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Start a new audit →
          </Link>
        </div>
      </>
    );
  }

  if (!run) {
    return (
      <>
        <AppHeader title="Loading run…" breadcrumb="Runs" />
        <div className="relative mx-auto w-full max-w-6xl px-6 py-16 text-sm text-muted-foreground">
          Loading…
        </div>
      </>
    );
  }

  const code = run.code_result;
  const policy = run.policy_result;
  const risk = run.risk_result;
  const review = run.review_result;

  // Prefer the reviewer's calibrated verdict if it exists.
  const headlineScore = review?.adjustedScore ?? risk?.overallScore ?? run.overall_score;
  const headlineLevel = review?.adjustedRiskLevel ?? risk?.riskLevel ?? run.risk_level;
  const headlineSummary = review?.verdict ?? risk?.executiveSummary ?? null;

  const reviewCount = review
    ? review.hallucinations.length +
      review.miscalibrations.length +
      review.missedRisks.length
    : 0;

  return (
    <>
      <AppHeader
        title={run.company_name}
        breadcrumb="Runs"
        actions={
          <>
            <button
              type="button"
              onClick={() => downloadJson(run)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Download JSON
            </button>
            <Link
              href="/new"
              className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              New audit
            </Link>
          </>
        }
      />

      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.15]" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--gradient-radial)" }}
        />

        <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-8">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {run.framework} · {new Date(run.created_at).toLocaleString()}
              {run.repo_url ? (
                <>
                  {" · "}
                  <a
                    href={run.repo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {shortenRepo(run.repo_url)}
                  </a>
                </>
              ) : null}
              {review ? (
                <>
                  {" · "}
                  <span className="text-foreground/80">
                    reviewer confidence: {review.confidence}
                  </span>
                </>
              ) : null}
            </p>
            {headlineSummary && (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/80">
                {headlineSummary}
              </p>
            )}
          </div>

          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
            }}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <ScoreCard
              label="Code"
              score={code?.score ?? null}
              level={code?.riskLevel ?? null}
              caption={
                code
                  ? `${code.findings.length} findings · ${code.stats?.criticalCount ?? 0} critical`
                  : "No code audit"
              }
              trend={code ? buildCodeTrend(code.findings.length) : undefined}
            />
            <ScoreCard
              label="Policy"
              score={policy?.score ?? null}
              level={policy?.riskLevel ?? null}
              caption={
                policy
                  ? `${policy.conflicts.length} conflicts · ${policy.gaps.length} gaps`
                  : "No policy audit"
              }
              trend={
                policy
                  ? buildCodeTrend(
                      policy.conflicts.length +
                        policy.gaps.length +
                        policy.codeVsPolicyConflicts.length,
                    )
                  : undefined
              }
            />
            <ScoreCard
              label={review ? "Reviewer-adjusted risk" : "Overall risk"}
              score={headlineScore}
              level={headlineLevel}
              caption={
                review
                  ? `${review.actNow.length} act-now · ${review.missedRisks.length} missed risks`
                  : risk
                    ? `${risk.topInsights.length} insights · ${risk.priorityActions.length} actions`
                    : "—"
              }
              big
              trend={
                review
                  ? buildCodeTrend(review.actNow.length + review.missedRisks.length + 2)
                  : risk
                    ? buildCodeTrend(
                        risk.topInsights.length + risk.priorityActions.length,
                      )
                    : undefined
              }
            />
          </motion.div>

          <div className="mt-10 flex flex-wrap gap-4 border-b border-border sm:gap-6">
            <TabButton active={tab === "insights"} onClick={() => setTab("insights")}>
              Insights & actions
            </TabButton>
            <TabButton active={tab === "code"} onClick={() => setTab("code")}>
              Code findings{code ? ` (${code.findings.length})` : ""}
            </TabButton>
            <TabButton active={tab === "policy"} onClick={() => setTab("policy")}>
              Policy findings
              {policy
                ? ` (${policy.conflicts.length + policy.gaps.length + policy.codeVsPolicyConflicts.length})`
                : ""}
            </TabButton>
            {review && (
              <TabButton active={tab === "review"} onClick={() => setTab("review")}>
                Reviewer{reviewCount > 0 ? ` (${reviewCount})` : ""}
              </TabButton>
            )}
          </div>

          <div className="py-8">
            {tab === "insights" && <InsightsTab risk={risk} />}
            {tab === "code" && <CodeTab findings={code?.findings ?? []} />}
            {tab === "policy" && <PolicyTab policy={policy} />}
            {tab === "review" && <ReviewTab review={review} />}
          </div>
        </div>
      </div>
    </>
  );
}

function ScoreCard({
  label,
  score,
  level,
  caption,
  big,
  trend,
}: {
  label: string;
  score: number | null | undefined;
  level: Severity | null | undefined;
  caption: string;
  big?: boolean;
  trend?: number[];
}) {
  const safeScore = typeof score === "number" ? score : 0;
  const display = useCountUp(safeScore, {
    enabled: typeof score === "number",
    duration: 900,
  });
  const tone = level ? severityTone(level) : "text-muted-foreground";

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
      }}
      className="card-lift relative overflow-hidden rounded-xl border border-border bg-surface/40 p-5"
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        {level && <SeverityBadge level={level} />}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={`font-semibold tracking-tight ${big ? "text-6xl" : "text-5xl"} ${tone}`}
        >
          {typeof score === "number" ? display : "—"}
        </span>
        <span className="font-mono text-xs text-muted-foreground">/100</span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{caption}</p>
      {trend && (
        <div className={`mt-4 ${tone}`}>
          <Sparkline data={trend} width={220} height={32} />
        </div>
      )}
    </motion.div>
  );
}

function severityTone(level: Severity) {
  switch (level) {
    case "critical":
      return "text-destructive";
    case "high":
      return "text-amber-400";
    case "medium":
      return "text-yellow-300";
    case "low":
      return "text-emerald-400";
  }
}

function SeverityBadge({ level }: { level: Severity }) {
  const cls = {
    critical: "border-destructive/40 bg-destructive/10 text-destructive",
    high: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    medium: "border-yellow-500/40 bg-yellow-500/10 text-yellow-200",
    low: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  }[level];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${cls}`}
    >
      {level}
    </span>
  );
}

function ControlChip({ id }: { id?: string | null }) {
  if (!id) return null;
  return (
    <span
      title={`Framework control: ${id}`}
      className="inline-flex items-center rounded-md border border-border bg-surface-elevated/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-foreground/80"
    >
      {id}
    </span>
  );
}

function ControlChipList({ ids }: { ids?: string[] | null }) {
  if (!ids || ids.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {ids.map((id, i) => (
        <ControlChip key={i} id={id} />
      ))}
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative -mb-px px-1 pb-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        active
          ? "font-semibold text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      {active && (
        <motion.span
          layoutId="run-tab-underline"
          className="absolute -bottom-px left-0 right-0 h-[2px] bg-foreground"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
    </button>
  );
}

function InsightsTab({ risk }: { risk: AuditRunRow["risk_result"] }) {
  if (!risk)
    return (
      <p className="text-sm text-muted-foreground">No risk synthesis available.</p>
    );
  return (
    <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
      <div>
        <h2 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Top insights
        </h2>
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06 } },
          }}
          className="space-y-4"
        >
          {risk.topInsights.map((i: TopInsight, idx: number) => (
            <motion.div
              key={idx}
              variants={{
                hidden: { opacity: 0, y: 6 },
                show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
              }}
              className="card-lift rounded-xl border border-border bg-surface/40 p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">
                  #{idx + 1}
                </span>
                <SeverityBadge level={i.severity} />
                <ControlChip id={i.controlId} />
              </div>
              <h3 className="mt-3 text-base font-semibold tracking-tight">
                {i.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-foreground/80">
                {i.description}
              </p>
              {i.evidence?.length > 0 && (
                <ul className="mt-3 space-y-1 font-mono text-[11px] text-muted-foreground">
                  {i.evidence.map((e, ei) => (
                    <li key={ei} className="flex gap-2">
                      <span aria-hidden="true" className="text-muted-foreground/60">
                        ↳
                      </span>
                      <span className="text-foreground/70">{e}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
      <div>
        <h2 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Priority actions
        </h2>
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.05 } },
          }}
          className="space-y-3"
        >
          {risk.priorityActions.map((a: PriorityAction, idx: number) => (
            <motion.div
              key={idx}
              variants={{
                hidden: { opacity: 0, y: 6 },
                show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
              }}
              className="card-lift rounded-xl border border-border bg-surface/40 p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">
                  #{a.rank}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {a.timeframe}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium">{a.title}</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                Owner: {a.owner}
              </p>
              <ControlChipList ids={a.controlIds} />
              {a.closes?.length > 0 && (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">
                  Closes {a.closes.length}{" "}
                  {a.closes.length === 1 ? "insight" : "insights"}
                </p>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function CodeTab({ findings }: { findings: CodeFinding[] }) {
  if (findings.length === 0)
    return <p className="text-sm text-muted-foreground">No code findings.</p>;

  const sorted = [...findings].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity),
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface/40">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-elevated/40">
          <tr className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <th className="px-4 py-2 font-normal">Severity</th>
            <th className="px-4 py-2 font-normal">Control</th>
            <th className="px-4 py-2 font-normal">Category</th>
            <th className="px-4 py-2 font-normal">File</th>
            <th className="px-4 py-2 font-normal">Issue</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((f, idx) => (
            <tr
              key={idx}
              className="border-t border-border align-top transition-colors hover:bg-surface-elevated/30"
            >
              <td className="px-4 py-3">
                <SeverityBadge level={f.severity} />
              </td>
              <td className="px-4 py-3">
                <ControlChip id={f.controlId} />
              </td>
              <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                {f.category}
              </td>
              <td className="px-4 py-3 font-mono text-[11px] text-foreground/80">
                {f.file}
                {f.line ? `:${f.line}` : ""}
              </td>
              <td className="px-4 py-3">
                <p className="text-foreground/90">{f.issue}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  → {f.recommendation}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PolicyTab({ policy }: { policy: AuditRunRow["policy_result"] }) {
  if (!policy) return <p className="text-sm text-muted-foreground">No policy audit.</p>;

  const hasContent =
    policy.codeVsPolicyConflicts.length > 0 ||
    policy.conflicts.length > 0 ||
    policy.gaps.length > 0;

  if (!hasContent)
    return (
      <p className="text-sm text-muted-foreground">
        No policy conflicts or gaps detected.
      </p>
    );

  return (
    <div className="space-y-10">
      {policy.codeVsPolicyConflicts.length > 0 && (
        <section>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Code vs policy contradictions
          </h2>
          <div className="space-y-3">
            {policy.codeVsPolicyConflicts.map((c: CodeVsPolicy, idx: number) => (
              <div
                key={idx}
                className="card-lift rounded-xl border border-border bg-surface/40 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge level={c.severity} />
                  <ControlChip id={c.controlId} />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {c.policyDoc} ↔ {c.codeLocation}
                  </span>
                </div>
                <p className="mt-3 text-sm">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Policy
                  </span>
                  <br />
                  <span className="text-foreground/90">{c.policy}</span>
                </p>
                <p className="mt-2 text-sm">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Code
                  </span>
                  <br />
                  <span className="text-foreground/90">{c.code}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
      {policy.conflicts.length > 0 && (
        <section>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Internal policy conflicts
          </h2>
          <div className="space-y-3">
            {policy.conflicts.map((c: PolicyConflict, idx: number) => (
              <div
                key={idx}
                className="card-lift rounded-xl border border-border bg-surface/40 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge level={c.severity} />
                  <ControlChip id={c.controlId} />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {c.docs.join(" / ")}
                  </span>
                </div>
                <p className="mt-3 text-sm text-foreground/90">{c.issue}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  → {c.recommendation}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
      {policy.gaps.length > 0 && (
        <section>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Gaps
          </h2>
          <div className="space-y-3">
            {policy.gaps.map((g: PolicyGap, idx: number) => (
              <div
                key={idx}
                className="card-lift rounded-xl border border-border bg-surface/40 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge level={g.severity} />
                  <ControlChip id={g.controlId} />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {g.requirement}
                  </span>
                </div>
                <p className="mt-3 text-sm text-foreground/90">{g.issue}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  → {g.recommendation}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ReviewTab({ review }: { review: ReviewResult | null }) {
  if (!review)
    return <p className="text-sm text-muted-foreground">No reviewer pass available.</p>;

  return (
    <div className="space-y-10">
      <section className="card-lift rounded-xl border border-border bg-surface/40 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Reviewer verdict
          </span>
          <SeverityBadge level={review.adjustedRiskLevel} />
          <span className="font-mono text-[11px] text-muted-foreground">
            confidence: {review.confidence}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            adjusted score: {review.adjustedScore}/100
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-foreground/90">{review.verdict}</p>
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Act this week ({review.actNow.length})
          </h2>
          <div className="space-y-3">
            {review.actNow.map((a: ReviewActionNow, idx) => (
              <div
                key={idx}
                className="card-lift rounded-xl border border-border bg-surface/40 p-4"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    #{a.rank}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium">{a.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.why}</p>
                <ControlChipList ids={a.controlIds} />
              </div>
            ))}
            {review.actNow.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing flagged as urgent.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Defer ({review.defer.length})
          </h2>
          <div className="space-y-3">
            {review.defer.map((d: ReviewDefer, idx) => (
              <div
                key={idx}
                className="card-lift rounded-xl border border-border bg-surface/40 p-4"
              >
                <p className="text-sm font-medium">{d.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{d.why}</p>
              </div>
            ))}
            {review.defer.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing explicitly deferred.</p>
            )}
          </div>
        </section>
      </div>

      {review.missedRisks.length > 0 && (
        <section>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Missed risks ({review.missedRisks.length})
          </h2>
          <div className="space-y-3">
            {review.missedRisks.map((m: ReviewMissedRisk, idx) => (
              <div
                key={idx}
                className="card-lift rounded-xl border border-border bg-surface/40 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge level={m.severity} />
                  <ControlChip id={m.controlId} />
                </div>
                <h3 className="mt-2 text-sm font-semibold">{m.title}</h3>
                <p className="mt-1 text-sm text-foreground/80">{m.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {review.miscalibrations.length > 0 && (
        <section>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Severity miscalibrations ({review.miscalibrations.length})
          </h2>
          <div className="space-y-3">
            {review.miscalibrations.map((m: ReviewMiscalibration, idx) => (
              <div
                key={idx}
                className="card-lift rounded-xl border border-border bg-surface/40 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    from
                  </span>
                  <SeverityBadge level={m.originalSeverity} />
                  <span aria-hidden className="text-muted-foreground">
                    →
                  </span>
                  <SeverityBadge level={m.suggestedSeverity} />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    ({m.source})
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground/90">{m.finding}</p>
                <p className="mt-1 text-xs text-muted-foreground">{m.rationale}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {review.hallucinations.length > 0 && (
        <section>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Unsupported / hallucinated ({review.hallucinations.length})
          </h2>
          <div className="space-y-3">
            {review.hallucinations.map((h: ReviewHallucination, idx) => (
              <div
                key={idx}
                className="card-lift rounded-xl border border-border bg-surface/40 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge level={h.severity} />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    source: {h.source}
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground/90">{h.issue}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function severityRank(s: Severity): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[s];
}

function buildCodeTrend(count: number): number[] {
  // Deterministic pseudo-trend so the sparkline has motion without mock data.
  const base = Math.max(3, Math.min(18, count));
  const out: number[] = [];
  for (let i = 0; i < 12; i++) {
    const wobble = Math.sin(i * 0.9 + base) * (base * 0.35);
    out.push(Math.max(0, Math.round(base + wobble)));
  }
  return out;
}

function shortenRepo(url: string) {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return url;
  }
}

function downloadJson(run: AuditRunRow) {
  const blob = new Blob([JSON.stringify(run, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lexitude-${run.company_name.replace(/\s+/g, "-").toLowerCase()}-${run.id.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
