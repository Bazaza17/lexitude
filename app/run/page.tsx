"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { consumeNdjsonStream, type AuditStreamEvent } from "@/lib/stream-client";
import type { Framework, RepoSnapshot, RepoSnapshotFlag } from "@/lib/types";
import { Logo } from "@/components/site/Logo";

type PendingAudit = {
  companyName: string;
  framework: Framework;
  repoUrl: string;
  repoPaths: string[];
  policyText: string;
  policyFiles: Array<{ name: string; text: string }>;
};

type ModuleState = {
  status: "idle" | "running" | "done" | "error";
  commentary: string;
  thinking: string;
  result: unknown;
  error: string | null;
};

const emptyModule: ModuleState = {
  status: "idle",
  commentary: "",
  thinking: "",
  result: null,
  error: null,
};

export default function RunAuditPage() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAudit | null>(null);
  const [overall, setOverall] = useState<string>("Preparing inputs");
  const [ingest, setIngest] = useState<ModuleState>(emptyModule);
  const [code, setCode] = useState<ModuleState>(emptyModule);
  const [policy, setPolicy] = useState<ModuleState>(emptyModule);
  const [risk, setRisk] = useState<ModuleState>(emptyModule);
  const [review, setReview] = useState<ModuleState>(emptyModule);
  const [snapshot, setSnapshot] = useState<ModuleState>(emptyModule);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("lexitude:pending");
    if (!raw) {
      router.replace("/new");
      return;
    }
    try {
      const p = JSON.parse(raw) as PendingAudit;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPending(p);
    } catch {
      router.replace("/new");
    }
  }, [router]);

  useEffect(() => {
    if (!pending || started.current) return;
    started.current = true;
    void runPipeline(pending, {
      setOverall,
      setIngest,
      setCode,
      setPolicy,
      setRisk,
      setReview,
      setSnapshot,
      onSaved: (id) => router.replace(`/run/${id}`),
      onFatal: (msg) => setFatalError(msg),
    });
  }, [pending, router]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-[0.2]" />
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "var(--gradient-radial)" }}
      />

      <header className="relative border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between px-6 py-2">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="text-sm font-semibold tracking-tight">Lexitude</span>
          </Link>
          <Link
            href="/history"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Past runs →
          </Link>
        </div>
      </header>

      <div className="relative mx-auto w-full max-w-5xl px-6 py-10">
        {!pending ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <div className="mb-8">
              <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Auditing · {pending.framework}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {pending.companyName}
              </h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-foreground/70"
                  style={{ animation: "pulse-dot 1.6s ease-in-out infinite" }}
                />
                {overall}
              </p>
            </div>

            {fatalError && (
              <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {fatalError}
              </div>
            )}

            <SnapshotCard state={snapshot} />

            <div className="space-y-4">
              <ModuleCard number="00" title="Ingest" subtitle="Fetch repo + parse policies" state={ingest} />
              <ModuleCard
                number="01"
                title="Code Compliance"
                subtitle="Haiku 4.5 · scoring repository"
                state={code}
              />
              <ModuleCard
                number="02"
                title="Policy Intelligence"
                subtitle={
                  pending.policyFiles.length === 0 && !pending.policyText.trim()
                    ? "Haiku 4.5 · inferring required policies from framework + code"
                    : "Haiku 4.5 · reading policies, flagging conflicts"
                }
                state={policy}
              />
              <ModuleCard
                number="03"
                title="Risk Surface"
                subtitle="Opus 4.7 · extended thinking cross-reference"
                state={risk}
              />
              <ModuleCard
                number="04"
                title="Audit Review"
                subtitle="Haiku 4.5 · independent calibration (runs in parallel with Risk)"
                state={review}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ModuleCard({
  number,
  title,
  subtitle,
  state,
}: {
  number: string;
  title: string;
  subtitle: string;
  state: ModuleState;
}) {
  const logRef = useRef<HTMLDivElement>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);
  // null = "auto" (open whenever thinking exists), true/false = explicit user choice
  const [reasoningPref, setReasoningPref] = useState<boolean | null>(null);
  const reasoningOpen =
    reasoningPref === null ? state.thinking.length > 0 : reasoningPref;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [state.commentary]);

  useEffect(() => {
    if (thinkingRef.current)
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
  }, [state.thinking]);

  const badge =
    state.status === "done"
      ? "Done"
      : state.status === "running"
        ? "Running"
        : state.status === "error"
          ? "Error"
          : "Queued";

  const dot =
    state.status === "done"
      ? "bg-emerald-400"
      : state.status === "running"
        ? "bg-foreground/80"
        : state.status === "error"
          ? "bg-destructive"
          : "bg-muted-foreground/40";

  const hasThinking = state.thinking.length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden rounded-xl border border-border bg-surface/40"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs text-muted-foreground">{number}</span>
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
        <div className="flex items-center gap-2">
          {hasThinking && (
            <button
              type="button"
              onClick={() => setReasoningPref(!reasoningOpen)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
              aria-expanded={reasoningOpen}
              aria-label={reasoningOpen ? "Hide reasoning" : "Show reasoning"}
            >
              <span aria-hidden className="text-foreground/60">◇</span>
              Reasoning
              <span aria-hidden className="ml-0.5 text-muted-foreground/60">
                {reasoningOpen ? "−" : "+"}
              </span>
            </button>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span
              className={`h-1.5 w-1.5 rounded-full ${dot}`}
              style={
                state.status === "running"
                  ? { animation: "pulse-dot 1.6s ease-in-out infinite" }
                  : undefined
              }
            />
            {badge}
          </span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {hasThinking && reasoningOpen && (
          <motion.div
            key="reasoning"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-border bg-background/60"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Extended thinking · summarized
              </span>
            </div>
            <div
              ref={thinkingRef}
              className="max-h-56 overflow-y-auto px-5 py-3 font-mono text-xs leading-relaxed text-muted-foreground"
            >
              <pre className="whitespace-pre-wrap italic text-foreground/60">
                {state.thinking}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(state.commentary || state.error) && (
        <div
          ref={logRef}
          className="relative max-h-56 overflow-y-auto bg-background px-5 py-3 font-mono text-xs leading-relaxed text-muted-foreground"
        >
          {state.error ? (
            <span className="text-destructive">{state.error}</span>
          ) : (
            <pre className="whitespace-pre-wrap text-foreground/80">
              {state.commentary}
            </pre>
          )}
        </div>
      )}
    </motion.div>
  );
}

function SnapshotCard({ state }: { state: ModuleState }) {
  const snap = state.result as RepoSnapshot | null;
  const hasContent = snap || state.commentary || state.status !== "idle";

  if (!hasContent) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4 overflow-hidden rounded-xl border border-border bg-surface/40"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Repo snapshot
          </span>
          <span className="text-xs text-muted-foreground">
            Haiku 4.5 · fast first impression
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              state.status === "done"
                ? "bg-emerald-400"
                : state.status === "running"
                  ? "bg-foreground/80"
                  : state.status === "error"
                    ? "bg-destructive"
                    : "bg-muted-foreground/40"
            }`}
            style={
              state.status === "running"
                ? { animation: "pulse-dot 1.6s ease-in-out infinite" }
                : undefined
            }
          />
          {state.status === "done"
            ? "Done"
            : state.status === "running"
              ? "Scanning"
              : state.status === "error"
                ? "Error"
                : "Queued"}
        </span>
      </div>

      {snap ? (
        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Stack
              </p>
              <p className="mt-1 text-sm text-foreground/90">{snap.stack}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Surface
              </p>
              <p className="mt-1 text-sm text-foreground/90">{snap.surface}</p>
            </div>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              First impression
            </p>
            <p className="mt-1 text-sm leading-6 text-foreground/80">
              {snap.firstImpression}
            </p>
          </div>
          {snap.quickFlags && snap.quickFlags.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Quick flags ({snap.quickFlags.length})
              </p>
              <ul className="mt-2 space-y-1.5">
                {snap.quickFlags.map((f: RepoSnapshotFlag, i: number) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-xs"
                  >
                    <SnapshotSeverityDot level={f.severity} />
                    <div className="flex-1">
                      <p className="font-medium text-foreground/90">{f.flag}</p>
                      <p className="text-muted-foreground">{f.why}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : state.error ? (
        <div className="px-5 py-3 font-mono text-xs text-destructive">
          {state.error}
        </div>
      ) : (
        <div className="px-5 py-3 font-mono text-xs text-muted-foreground">
          <pre className="whitespace-pre-wrap text-foreground/70">
            {state.commentary || "Sniffing the repo…"}
          </pre>
        </div>
      )}
    </motion.div>
  );
}

function SnapshotSeverityDot({ level }: { level: "low" | "medium" | "high" | "critical" }) {
  const bg = {
    critical: "bg-destructive",
    high: "bg-amber-400",
    medium: "bg-yellow-300",
    low: "bg-emerald-400",
  }[level];
  return (
    <span
      aria-hidden="true"
      className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${bg}`}
    />
  );
}

async function runPipeline(
  p: PendingAudit,
  h: {
    setOverall: (s: string) => void;
    setIngest: React.Dispatch<React.SetStateAction<ModuleState>>;
    setCode: React.Dispatch<React.SetStateAction<ModuleState>>;
    setPolicy: React.Dispatch<React.SetStateAction<ModuleState>>;
    setRisk: React.Dispatch<React.SetStateAction<ModuleState>>;
    setReview: React.Dispatch<React.SetStateAction<ModuleState>>;
    setSnapshot: React.Dispatch<React.SetStateAction<ModuleState>>;
    onSaved: (id: string) => void;
    onFatal: (msg: string) => void;
  },
) {
  try {
    // --- Ingest ---
    h.setIngest({ ...emptyModule, status: "running" });
    h.setOverall("Fetching repository and parsing policies");

    const ghRes = await fetch("/api/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repoUrl: p.repoUrl,
        selectedPaths: p.repoPaths.length > 0 ? p.repoPaths : undefined,
      }),
    });
    const ghJson = await readJsonOrThrow(ghRes, "Ingest (/api/github)");
    if (!ghRes.ok) throw new Error((ghJson?.error as string) ?? "GitHub fetch failed");

    const files = (ghJson.files as Array<{ path: string; content: string; language: string; bytes: number; truncated: boolean }>) ?? [];
    if (files.length === 0) {
      throw new Error("No files matched the selected paths");
    }

    let docs: Array<{ filename: string; chunks: string[]; charCount: number }> = [];
    if (p.policyFiles.length > 0 || p.policyText.trim()) {
      const docsRes = await fetch("/api/parse-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docs: p.policyFiles.map((f) => ({ filename: f.name, text: f.text })),
          text: p.policyText,
        }),
      });
      const docsJson = await readJsonOrThrow(docsRes, "Policy parse (/api/parse-docs)");
      if (!docsRes.ok) throw new Error((docsJson?.error as string) ?? "Policy parse failed");
      docs = (docsJson.docs as typeof docs) ?? [];
    }

    h.setIngest({
      status: "done",
      commentary: `Fetched ${files.length} files from ${p.repoUrl}.\nParsed ${docs.length} policy documents.`,
      thinking: "",
      result: { files: files.length, docs: docs.length },
      error: null,
    });

    // --- Snapshot + Code + Policy all in parallel ---
    // Snapshot is a fast (~3s) Haiku pass on the file tree + package.json +
    // README only. It lands well before Code/Policy finish and gives the
    // user something to read while the heavy audit runs.
    h.setSnapshot({ ...emptyModule, status: "running" });
    h.setCode({ ...emptyModule, status: "running" });
    h.setOverall(
      "Parallel scan — snapshot · code compliance · policy intelligence",
    );

    // Don't block on snapshot — we don't need its result for downstream
    // modules. Let it land whenever it lands and update the UI in place.
    void streamAudit(h.setSnapshot, "/api/audit/snapshot", {
      companyName: p.companyName,
      framework: p.framework,
      files,
    }).catch(() => {
      // Non-fatal. Snapshot is a UX nicety; its failure shouldn't kill the run.
    });

    const codePromise = streamAudit(h.setCode, "/api/audit/code", {
      companyName: p.companyName,
      framework: p.framework,
      files,
    });

    // No-policies mode: if the user didn't upload anything, we still run
    // Policy — but with docs:[] the backend switches to "inferred gap"
    // mode, producing the required-policy list this company needs. This
    // keeps the downstream Risk + Review modules (and the drafting engine)
    // working on a real PolicyResult rather than null. See
    // policyAuditNoDocsSystemPrompt in lib/audit-prompts.ts.
    h.setPolicy({ ...emptyModule, status: "running" });
    const policyPromise = streamAudit(h.setPolicy, "/api/audit/policy", {
      companyName: p.companyName,
      framework: p.framework,
      docs,
    });

    // Use allSettled so a Policy failure doesn't dead-end the whole run.
    // The module's own card already shows the error; we just need to keep
    // Risk + Review flowing against whatever data we do have.
    const [codeSettled, policySettled] = await Promise.allSettled([
      codePromise,
      policyPromise,
    ]);
    const codeResult = codeSettled.status === "fulfilled" ? codeSettled.value : null;
    const policyResult =
      policySettled.status === "fulfilled" ? policySettled.value : null;

    // If Code failed outright, we can't produce anything useful — bail.
    if (!codeResult) {
      throw new Error(
        codeSettled.status === "rejected"
          ? codeSettled.reason?.message ?? "Code audit failed"
          : "Code audit returned no result",
      );
    }

    // --- Risk synthesis + Reviewer (parallel) ---
    // Reviewer is now an independent second-opinion on code+policy, not a
    // meta-critique of Risk — so we can run both at once. Risk is the long
    // tail (Opus extended thinking); running Review in parallel saves ~Review
    // duration from total wall-clock.
    h.setRisk({ ...emptyModule, status: "running" });
    h.setReview({ ...emptyModule, status: "running" });
    h.setOverall(
      policyResult
        ? "Parallel synthesis — risk (Opus 4.7) · review (Haiku 4.5, independent calibration)"
        : "Parallel synthesis (policy unavailable) — risk + review running on code only",
    );

    const riskPromise = streamAudit(h.setRisk, "/api/audit/risk", {
      companyName: p.companyName,
      framework: p.framework,
      codeResult,
      policyResult,
    });

    const reviewPromise = streamAudit(h.setReview, "/api/audit/review", {
      companyName: p.companyName,
      framework: p.framework,
      codeResult,
      policyResult,
    });

    const [riskSettled, reviewSettled] = await Promise.allSettled([
      riskPromise,
      reviewPromise,
    ]);
    const riskResult = riskSettled.status === "fulfilled" ? riskSettled.value : null;
    const reviewResult =
      reviewSettled.status === "fulfilled" ? reviewSettled.value : null;

    // --- Save run ---
    h.setOverall("Saving run");
    const saveRes = await fetch("/api/audit/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: p.companyName,
        framework: p.framework,
        repoUrl: p.repoUrl,
        repoBranch: (ghJson.branch as string | undefined) ?? null,
        fileCount: files.length,
        docCount: docs.length,
        codeResult,
        policyResult,
        riskResult,
        reviewResult,
      }),
    });
    const saveJson = await readJsonOrThrow(saveRes, "Save (/api/audit/runs)");
    if (!saveRes.ok || !saveJson?.id) {
      throw new Error((saveJson?.error as string) ?? "Save failed");
    }

    sessionStorage.removeItem("lexitude:pending");
    h.setOverall("Complete");
    h.onSaved(saveJson.id as string);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    h.onFatal(msg);
  }
}

// Safely read a fetch response as JSON. When a serverless function times
// out or crashes, Vercel returns its default HTML error page — calling
// `res.json()` on that throws `Unexpected token '<', "<!DOCTYPE "...`
// which tells the user nothing useful. This helper inspects Content-Type
// first and surfaces the real status + body snippet instead. It should be
// used on every non-streaming fetch in this pipeline.
async function readJsonOrThrow(
  res: Response,
  label: string,
): Promise<Record<string, unknown>> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return (await res.json()) as Record<string, unknown>;
  }
  // Not JSON — read the body as text so we can tell the user *why*. Vercel
  // timeouts, Next 404s, and reverse-proxy errors all land here.
  const text = await res.text();
  const hint =
    res.status === 504 || /timeout/i.test(text)
      ? " (function timed out — check Vercel function logs and maxDuration)"
      : res.status === 500
      ? " (server error — check Vercel function logs and env vars)"
      : "";
  throw new Error(
    `${label} returned ${res.status} ${res.statusText}${hint}: ${text.slice(0, 240)}`,
  );
}

async function streamAudit(
  setState: React.Dispatch<React.SetStateAction<ModuleState>>,
  url: string,
  body: unknown,
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let result: unknown = null;
  let moduleError: string | null = null;

  await consumeNdjsonStream(res, (ev: AuditStreamEvent) => {
    if (ev.type === "delta") {
      setState((s) => ({ ...s, commentary: s.commentary + ev.text }));
    } else if (ev.type === "thinking") {
      setState((s) => ({ ...s, thinking: s.thinking + ev.text }));
    } else if (ev.type === "result") {
      result = ev.payload;
    } else if (ev.type === "error") {
      moduleError = ev.message;
    }
  });

  if (moduleError && !result) {
    setState((s) => ({ ...s, status: "error", error: moduleError }));
    throw new Error(moduleError);
  }

  setState((s) => ({
    ...s,
    status: "done",
    result,
    error: moduleError,
  }));

  return result;
}
