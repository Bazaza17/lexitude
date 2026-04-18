"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import type {
  AuditRunRow,
  CodeFinding,
  PolicyConflict,
  PolicyGap,
  CodeVsPolicy,
  TopInsight,
  PriorityAction,
  Severity,
} from "@/lib/types";

type Tab = "insights" | "code" | "policy";

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
      <div className="mx-auto w-full max-w-3xl px-6 py-16">
        <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
        <Link href="/new" className="mt-4 inline-block text-sm underline">
          Start a new audit
        </Link>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-16 text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  const code = run.code_result;
  const policy = run.policy_result;
  const risk = run.risk_result;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            {run.framework} · {new Date(run.created_at).toLocaleString()}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {run.company_name}
          </h1>
          {risk?.executiveSummary && (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              {risk.executiveSummary}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadJson(run)}
            className="border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:border-black dark:border-zinc-700 dark:hover:border-white"
          >
            ⭳ Download JSON
          </button>
          <Link
            href="/new"
            className="bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            New audit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px border border-zinc-200 bg-zinc-200 md:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-800">
        <ScoreCard
          label="Code"
          score={code?.score ?? null}
          level={code?.riskLevel ?? null}
          caption={
            code
              ? `${code.findings.length} findings · ${code.stats?.criticalCount ?? 0} critical`
              : "No code audit"
          }
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
        />
        <ScoreCard
          label="Overall risk"
          score={risk?.overallScore ?? run.overall_score}
          level={risk?.riskLevel ?? run.risk_level}
          caption={
            risk
              ? `${risk.topInsights.length} insights · ${risk.priorityActions.length} actions`
              : "—"
          }
          big
        />
      </div>

      <div className="mt-10 flex gap-6 border-b border-zinc-200 dark:border-zinc-800">
        <TabButton active={tab === "insights"} onClick={() => setTab("insights")}>
          Insights & actions
        </TabButton>
        <TabButton active={tab === "code"} onClick={() => setTab("code")}>
          Code findings {code ? `(${code.findings.length})` : ""}
        </TabButton>
        <TabButton active={tab === "policy"} onClick={() => setTab("policy")}>
          Policy findings{" "}
          {policy
            ? `(${policy.conflicts.length + policy.gaps.length + policy.codeVsPolicyConflicts.length})`
            : ""}
        </TabButton>
      </div>

      <div className="py-8">
        {tab === "insights" && <InsightsTab risk={risk} />}
        {tab === "code" && <CodeTab findings={code?.findings ?? []} />}
        {tab === "policy" && <PolicyTab policy={policy} />}
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  score,
  level,
  caption,
  big,
}: {
  label: string;
  score: number | null | undefined;
  level: Severity | null | undefined;
  caption: string;
  big?: boolean;
}) {
  const toneClass = level ? severityBg(level) : "bg-white dark:bg-black";
  return (
    <div className={`${toneClass} p-6`}>
      <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <div className="mt-3 flex items-baseline gap-3">
        <span
          className={`font-semibold tracking-tight ${big ? "text-6xl" : "text-5xl"}`}
        >
          {typeof score === "number" ? score : "—"}
        </span>
        {level && <SeverityBadge level={level} />}
      </div>
      <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">{caption}</p>
    </div>
  );
}

function severityBg(level: Severity) {
  switch (level) {
    case "critical":
      return "bg-red-50 dark:bg-red-950/30";
    case "high":
      return "bg-orange-50 dark:bg-orange-950/30";
    case "medium":
      return "bg-yellow-50 dark:bg-yellow-950/30";
    case "low":
      return "bg-emerald-50 dark:bg-emerald-950/30";
  }
}

function SeverityBadge({ level }: { level: Severity }) {
  const cls = {
    critical: "bg-red-600 text-white",
    high: "bg-orange-500 text-white",
    medium: "bg-yellow-500 text-black",
    low: "bg-emerald-500 text-white",
  }[level];
  return (
    <span className={`px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${cls}`}>
      {level}
    </span>
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
      onClick={onClick}
      className={`-mb-px border-b-2 px-1 pb-3 text-sm ${
        active
          ? "border-black font-semibold dark:border-white"
          : "border-transparent text-zinc-500 hover:text-black dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function InsightsTab({ risk }: { risk: AuditRunRow["risk_result"] }) {
  if (!risk) return <p className="text-sm text-zinc-500">No risk synthesis available.</p>;
  return (
    <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
      <div>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-zinc-500">
          Top insights
        </h2>
        <div className="space-y-4">
          {risk.topInsights.map((i: TopInsight, idx: number) => (
            <div
              key={idx}
              className="border-l-2 border-black pl-4 dark:border-white"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-500">
                  #{idx + 1}
                </span>
                <SeverityBadge level={i.severity} />
              </div>
              <h3 className="mt-2 text-base font-semibold">{i.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {i.description}
              </p>
              {i.evidence?.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs text-zinc-600 dark:text-zinc-400">
                  {i.evidence.map((e, ei) => (
                    <li key={ei}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-zinc-500">
          Priority actions
        </h2>
        <div className="space-y-3">
          {risk.priorityActions.map((a: PriorityAction, idx: number) => (
            <div
              key={idx}
              className="border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-xs text-zinc-500">
                  #{a.rank}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  {a.timeframe}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium">{a.title}</p>
              <p className="mt-1 text-xs text-zinc-500">Owner: {a.owner}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CodeTab({ findings }: { findings: CodeFinding[] }) {
  if (findings.length === 0)
    return <p className="text-sm text-zinc-500">No code findings.</p>;

  const sorted = [...findings].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity),
  );

  return (
    <div className="overflow-hidden border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-950">
          <tr className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            <th className="px-3 py-2">Severity</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">File</th>
            <th className="px-3 py-2">Issue</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((f, idx) => (
            <tr
              key={idx}
              className="border-t border-zinc-200 align-top dark:border-zinc-800"
            >
              <td className="px-3 py-3">
                <SeverityBadge level={f.severity} />
              </td>
              <td className="px-3 py-3 font-mono text-xs text-zinc-500">
                {f.category}
              </td>
              <td className="px-3 py-3 font-mono text-xs">
                {f.file}
                {f.line ? `:${f.line}` : ""}
              </td>
              <td className="px-3 py-3">
                <p>{f.issue}</p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
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
  if (!policy)
    return <p className="text-sm text-zinc-500">No policy audit.</p>;

  return (
    <div className="space-y-10">
      {policy.codeVsPolicyConflicts.length > 0 && (
        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-zinc-500">
            Code vs policy contradictions
          </h2>
          <div className="space-y-3">
            {policy.codeVsPolicyConflicts.map((c: CodeVsPolicy, idx: number) => (
              <div
                key={idx}
                className="border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <SeverityBadge level={c.severity} />
                  <span className="font-mono text-xs text-zinc-500">
                    {c.policyDoc} ↔ {c.codeLocation}
                  </span>
                </div>
                <p className="mt-2 text-sm">
                  <span className="text-zinc-500">Policy:</span> {c.policy}
                </p>
                <p className="mt-1 text-sm">
                  <span className="text-zinc-500">Code:</span> {c.code}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
      {policy.conflicts.length > 0 && (
        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-zinc-500">
            Internal policy conflicts
          </h2>
          <div className="space-y-3">
            {policy.conflicts.map((c: PolicyConflict, idx: number) => (
              <div
                key={idx}
                className="border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <SeverityBadge level={c.severity} />
                  <span className="font-mono text-xs text-zinc-500">
                    {c.docs.join(" / ")}
                  </span>
                </div>
                <p className="mt-2 text-sm">{c.issue}</p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  → {c.recommendation}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
      {policy.gaps.length > 0 && (
        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-zinc-500">
            Gaps
          </h2>
          <div className="space-y-3">
            {policy.gaps.map((g: PolicyGap, idx: number) => (
              <div
                key={idx}
                className="border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <SeverityBadge level={g.severity} />
                  <span className="font-mono text-xs text-zinc-500">
                    {g.requirement}
                  </span>
                </div>
                <p className="mt-2 text-sm">{g.issue}</p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
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

function severityRank(s: Severity): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[s];
}

function downloadJson(run: AuditRunRow) {
  const blob = new Blob([JSON.stringify(run, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `auditai-${run.company_name.replace(/\s+/g, "-").toLowerCase()}-${run.id.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
