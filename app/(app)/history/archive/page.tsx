"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppHeader } from "@/components/app/AppHeader";
import { frameworkDisplayName, type Framework, type RiskLevel } from "@/lib/types";

type RunSummary = {
  id: string;
  created_at: string;
  company_name: string;
  framework: Framework;
  overall_score: number | null;
  risk_level: RiskLevel | null;
  file_count: number | null;
  doc_count: number | null;
  archived_at: string | null;
};

export default function ArchivePage() {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/audit/runs?archive=archived");
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to load archive");
        setRuns(json.runs ?? []);
        setActiveCount(json.counts?.active ?? 0);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, []);

  const handleRestore = useCallback(
    async (id: string) => {
      setRestoringId(id);
      const snapshot = runs;
      setRuns((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
      setActiveCount((c) => c + 1);

      try {
        const res = await fetch(`/api/audit/runs/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: false }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error ?? "Failed to restore run");
        }
      } catch (e) {
        setRuns(snapshot);
        setActiveCount((c) => Math.max(0, c - 1));
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setRestoringId(null);
      }
    },
    [runs],
  );

  const handlePermanentDelete = useCallback(
    async (id: string) => {
      // Two-click confirm, auto-disarm after 3s. This is the irreversible
      // action; the soft-delete (archive) didn't need confirmation but
      // purging the row does.
      if (confirmDeleteId !== id) {
        setConfirmDeleteId(id);
        if (confirmTimer.current) clearTimeout(confirmTimer.current);
        confirmTimer.current = setTimeout(() => setConfirmDeleteId(null), 3000);
        return;
      }

      if (confirmTimer.current) {
        clearTimeout(confirmTimer.current);
        confirmTimer.current = null;
      }
      setConfirmDeleteId(null);
      setDeletingId(id);

      const snapshot = runs;
      setRuns((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));

      try {
        const res = await fetch(`/api/audit/runs/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error ?? "Failed to delete run");
        }
      } catch (e) {
        setRuns(snapshot);
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setDeletingId(null);
      }
    },
    [confirmDeleteId, runs],
  );

  const ordered = useMemo(() => {
    if (!runs) return runs;
    // Archived-at desc so the most recently archived is at the top.
    return [...runs].sort((a, b) => {
      const aT = a.archived_at ? new Date(a.archived_at).getTime() : 0;
      const bT = b.archived_at ? new Date(b.archived_at).getTime() : 0;
      return bT - aT;
    });
  }, [runs]);

  return (
    <>
      <AppHeader
        title="Archived audits"
        breadcrumb="Runs · Archive"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/history"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface/40 px-3 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              ← Active
              <span className="font-mono text-[10px] text-muted-foreground">
                {activeCount}
              </span>
            </Link>
            <Link
              href="/new"
              className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              New audit
            </Link>
          </div>
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
              Archive
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Soft-deleted runs
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Archived audits still exist — open or restore them any time. Use{" "}
              <span className="font-mono text-foreground">Delete forever</span>{" "}
              to purge a row permanently.
            </p>
          </div>

          {err && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {err}
            </div>
          )}

          {ordered && ordered.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-surface/20 px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing archived yet. Archive a run from{" "}
                <Link
                  href="/history"
                  className="underline decoration-dotted underline-offset-2 hover:text-foreground"
                >
                  Past audits
                </Link>{" "}
                and it will show up here.
              </p>
            </div>
          )}

          {ordered && ordered.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-surface/40">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-elevated/40">
                  <tr className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-4 py-2 font-normal">Archived</th>
                    <th className="px-4 py-2 font-normal">Company</th>
                    <th className="px-4 py-2 font-normal">Framework</th>
                    <th className="px-4 py-2 font-normal">Score</th>
                    <th className="px-4 py-2 font-normal">Risk</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {ordered.map((r, idx) => (
                      <motion.tr
                        key={r.id}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -12, transition: { duration: 0.18 } }}
                        transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.2) }}
                        className="border-t border-border align-middle transition-colors hover:bg-surface-elevated/30"
                      >
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                          {r.archived_at
                            ? new Date(r.archived_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {r.company_name}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-foreground/80">
                          {frameworkDisplayName(r.framework)}
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
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              href={`/run/${r.id}`}
                              className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                            >
                              Open →
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleRestore(r.id)}
                              disabled={restoringId === r.id || deletingId === r.id}
                              aria-label={`Restore audit for ${r.company_name}`}
                              className="inline-flex h-7 items-center rounded-md border border-border bg-surface/40 px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {restoringId === r.id ? "Restoring…" : "Restore"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePermanentDelete(r.id)}
                              disabled={deletingId === r.id || restoringId === r.id}
                              aria-label={
                                confirmDeleteId === r.id
                                  ? `Confirm permanent delete for ${r.company_name}`
                                  : `Delete forever audit for ${r.company_name}`
                              }
                              className={`inline-flex h-7 items-center rounded-md border px-2 font-mono text-[10px] uppercase tracking-widest transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 ${
                                confirmDeleteId === r.id
                                  ? "border-destructive/60 bg-destructive/10 text-destructive hover:bg-destructive/20"
                                  : "border-border bg-surface/40 text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                              }`}
                            >
                              <AnimatePresence mode="wait" initial={false}>
                                {deletingId === r.id ? (
                                  <motion.span
                                    key="deleting"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.12 }}
                                  >
                                    Deleting…
                                  </motion.span>
                                ) : confirmDeleteId === r.id ? (
                                  <motion.span
                                    key="confirm"
                                    initial={{ opacity: 0, y: -2 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 2 }}
                                    transition={{ duration: 0.12 }}
                                  >
                                    Sure?
                                  </motion.span>
                                ) : (
                                  <motion.span
                                    key="delete"
                                    initial={{ opacity: 0, y: -2 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 2 }}
                                    transition={{ duration: 0.12 }}
                                  >
                                    Delete forever
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
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
