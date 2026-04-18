"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { consumeNdjsonStream, type AuditStreamEvent } from "@/lib/stream-client";
import type { Framework } from "@/lib/types";

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
    const raw = sessionStorage.getItem("auditai:pending");
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

  if (!pending) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-16 text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          Auditing · {pending.framework}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {pending.companyName}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {overall}
        </p>
      </div>

      {fatalError && (
        <div className="mb-6 border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {fatalError}
        </div>
      )}

      <div className="space-y-6">
        <ModuleCard
          number="00"
          title="Ingest"
          subtitle="Fetch repo + parse policies"
          state={ingest}
        />
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
        ? "Running…"
        : state.status === "error"
          ? "Error"
          : "Queued";

  const badgeClass =
    state.status === "done"
      ? "bg-black text-white dark:bg-white dark:text-black"
      : state.status === "running"
        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black animate-pulse"
        : state.status === "error"
          ? "bg-red-600 text-white"
          : "border border-zinc-300 text-zinc-500 dark:border-zinc-700";

  return (
    <div className="border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs text-zinc-500">{number}</span>
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs text-zinc-500">{subtitle}</span>
        </div>
        <span className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest ${badgeClass}`}>
          {badge}
        </span>
      </div>
      {(state.commentary || state.error) && (
        <div
          ref={logRef}
          className="max-h-48 overflow-y-auto bg-zinc-50 px-5 py-3 font-mono text-xs leading-relaxed text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
        >
          {state.error ? (
            <span className="text-red-600 dark:text-red-400">{state.error}</span>
          ) : (
            <pre className="whitespace-pre-wrap">{state.commentary}</pre>
          )}
        </div>
      )}
    </div>
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

    sessionStorage.removeItem("auditai:pending");
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
