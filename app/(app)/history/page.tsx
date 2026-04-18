"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/app/AppHeader";
import type { Framework, RiskLevel } from "@/lib/types";

type RunSummary = {
  id: string;
  created_at: string;
  company_name: string;
  framework: Framework;
  overall_score: number | null;
  risk_level: RiskLevel | null;
  file_count: number | null;
  doc_count: number | null;
};

type Filter = "all" | Framework;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "SOC2", label: "SOC 2" },
  { key: "GDPR", label: "GDPR" },
  { key: "HIPAA", label: "HIPAA" },
];

export default function HistoryPage() {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/audit/runs");
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to load runs");
        setRuns(json.runs ?? []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!runs) return runs;
    if (filter === "all") return runs;
    return runs.filter((r) => r.framework === filter);
  }, [runs, filter]);

  const counts = useMemo(() => {
    const base = { all: 0, SOC2: 0, GDPR: 0, HIPAA: 0 } as Record<Filter, number>;
    if (!runs) return base;
    for (const r of runs) {
      base.all += 1;
      base[r.framework] += 1;
    }
    return base;
  }, [runs]);

  return (
    <>
      <AppHeader
        title="Past audits"
        breadcrumb="Runs"
        actions={
          <Link
            href="/new"
            className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            New audit
          </Link>
        }
      />

      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.15]" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--gradient-radial)" }}
        />

        <div className="relative mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-6">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              History
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Every run, every artifact
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Downloadable JSON for every audit. Filter by framework to find a
              specific engagement.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter by framework"
            className="mb-6 flex flex-wrap gap-2"
          >
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.key)}
                  className={`relative inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    active
                      ? "border-foreground/60 bg-surface-elevated text-foreground"
                      : "border-border bg-surface/40 text-muted-foreground hover:border-border-strong hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="history-filter-pill"
                      className="absolute inset-0 rounded-full bg-surface-elevated"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative">{f.label}</span>
                  <span className="relative font-mono text-[10px] text-muted-foreground">
                    {counts[f.key]}
                  </span>
                </button>
              );
            })}
          </div>

          {err && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {err}
            </div>
          )}

          {filtered && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-surface/20 px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {runs && runs.length === 0
                  ? "No audits yet."
                  : `No runs for ${FILTERS.find((f) => f.key === filter)?.label ?? filter}.`}
              </p>
              <Link
                href="/new"
                className="mt-3 inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
              >
                Start an audit
              </Link>
            </div>
          )}

          {filtered && filtered.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-surface/40">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-elevated/40">
                  <tr className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-4 py-2 font-normal">When</th>
                    <th className="px-4 py-2 font-normal">Company</th>
                    <th className="px-4 py-2 font-normal">Framework</th>
                    <th className="px-4 py-2 font-normal">Score</th>
                    <th className="px-4 py-2 font-normal">Risk</th>
                    <th className="px-4 py-2 font-normal">Inputs</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => (
                    <motion.tr
                      key={r.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.2) }}
                      className="border-t border-border align-middle transition-colors hover:bg-surface-elevated/30"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {r.company_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-foreground/80">
                        {r.framework}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold tracking-tight">
                          {r.overall_score ?? "—"}
                        </span>
                        <span className="ml-0.5 font-mono text-[10px] text-muted-foreground">
                          {typeof r.overall_score === "number" ? "/100" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.risk_level && <RiskPill level={r.risk_level} />}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                        {r.file_count ?? 0} files · {r.doc_count ?? 0} docs
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/run/${r.id}`}
                          className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Open →
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!runs && !err && (
            <div className="rounded-xl border border-border bg-surface/40 px-6 py-10 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function RiskPill({ level }: { level: RiskLevel }) {
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
