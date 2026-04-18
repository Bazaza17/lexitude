"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { consumeNdjsonStream, type AuditStreamEvent } from "@/lib/stream-client";
import type { Framework } from "@/lib/types";
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
  result: unknown;
  error: string | null;
};

const emptyModule: ModuleState = {
  status: "idle",
  commentary: "",
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

            <div className="space-y-4">
              <ModuleCard number="00" title="Ingest" subtitle="Fetch repo + parse policies" state={ingest} />
              <ModuleCard
                number="01"
                title="Code Compliance"
                subtitle="Score repository against framework"
                state={code}
              />
              <ModuleCard
                number="02"
                title="Policy Intelligence"
                subtitle="Read policies, flag conflicts and gaps"
                state={policy}
              />
              <ModuleCard
                number="03"
                title="Risk Surface"
                subtitle="Cross-reference code vs policy"
                state={risk}
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
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [state.commentary]);

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

async function runPipeline(
  p: PendingAudit,
  h: {
    setOverall: (s: string) => void;
    setIngest: React.Dispatch<React.SetStateAction<ModuleState>>;
    setCode: React.Dispatch<React.SetStateAction<ModuleState>>;
    setPolicy: React.Dispatch<React.SetStateAction<ModuleState>>;
    setRisk: React.Dispatch<React.SetStateAction<ModuleState>>;
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
    const ghJson = await ghRes.json();
    if (!ghRes.ok) throw new Error(ghJson?.error ?? "GitHub fetch failed");

    const files = ghJson.files ?? [];
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
      const docsJson = await docsRes.json();
      if (!docsRes.ok) throw new Error(docsJson?.error ?? "Policy parse failed");
      docs = docsJson.docs ?? [];
    }

    h.setIngest({
      status: "done",
      commentary: `Fetched ${files.length} files from ${p.repoUrl}.\nParsed ${docs.length} policy documents.`,
      result: { files: files.length, docs: docs.length },
      error: null,
    });

    // --- Code audit ---
    h.setCode({ ...emptyModule, status: "running" });
    h.setOverall("Module 1 of 3 — code compliance");
    const codeResult = await streamAudit(h.setCode, "/api/audit/code", {
      companyName: p.companyName,
      framework: p.framework,
      files,
    });

    // --- Policy audit ---
    h.setPolicy({ ...emptyModule, status: "running" });
    h.setOverall("Module 2 of 3 — policy intelligence");
    const policyResult =
      docs.length > 0
        ? await streamAudit(h.setPolicy, "/api/audit/policy", {
            companyName: p.companyName,
            framework: p.framework,
            docs,
            codeFindings: codeResult,
          })
        : null;
    if (docs.length === 0) {
      h.setPolicy({
        status: "done",
        commentary: "No policy documents provided — module skipped.",
        result: null,
        error: null,
      });
    }

    // --- Risk synthesis ---
    h.setRisk({ ...emptyModule, status: "running" });
    h.setOverall("Module 3 of 3 — risk synthesis");
    const riskResult = await streamAudit(h.setRisk, "/api/audit/risk", {
      companyName: p.companyName,
      framework: p.framework,
      codeResult,
      policyResult,
    });

    // --- Save run ---
    h.setOverall("Saving run");
    const saveRes = await fetch("/api/audit/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: p.companyName,
        framework: p.framework,
        repoUrl: p.repoUrl,
        repoBranch: ghJson.branch ?? null,
        fileCount: files.length,
        docCount: docs.length,
        codeResult,
        policyResult,
        riskResult,
      }),
    });
    const saveJson = await saveRes.json();
    if (!saveRes.ok || !saveJson?.id) {
      throw new Error(saveJson?.error ?? "Save failed");
    }

    sessionStorage.removeItem("lexitude:pending");
    h.setOverall("Complete");
    h.onSaved(saveJson.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    h.onFatal(msg);
  }
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
