"use client";

import { motion } from "framer-motion";

/**
 * Animated compliance dashboard mock for the hero.
 * Mirrors the real Lexitude result dashboard shape: code / policy / risk.
 */
export function DashboardMock() {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-surface glow-ring">
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-border bg-surface-elevated/60 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full border border-border" />
          <div className="h-2.5 w-2.5 rounded-full border border-border" />
          <div className="h-2.5 w-2.5 rounded-full border border-border" />
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">finovabank.lexitude.app</div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
              style={{ animation: "pulse-dot 1.6s ease-in-out infinite" }}
            />
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">live</span>
        </div>
      </div>

      <div className="p-4">
        {/* Score header */}
        <div className="flex items-end justify-between">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Overall risk · SOC 2
            </div>
            <div className="mt-1 flex items-end gap-2">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="font-mono text-3xl text-foreground"
              >
                34
              </motion.div>
              <div className="pb-1 font-mono text-[10px] text-destructive">▲ critical</div>
            </div>
          </div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            9 files · 2 policies
          </div>
        </div>

        {/* Module scores */}
        <div className="mt-5 space-y-2.5">
          <ModuleBar name="Code compliance" pct={28} score={28} delay={0.5} tone="critical" />
          <ModuleBar name="Policy intelligence" pct={52} score={52} delay={0.65} tone="high" />
          <ModuleBar name="Risk surface" pct={34} score={34} delay={0.8} tone="critical" />
        </div>

        {/* Bottom: top insight */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="mt-5 rounded-md border border-border bg-background p-3"
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-wider text-destructive">
              ⚠ top insight
            </span>
            <span className="font-mono text-[9px] text-muted-foreground">
              policy ↔ code
            </span>
          </div>
          <div className="text-[11px] text-foreground">
            Policy claims &ldquo;we never log PII&rdquo; — code writes SSNs to
            request logs.
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            lib/logger.ts:47 ↔ Data_Privacy_Policy.md §3.2
          </div>
        </motion.div>
      </div>

      {/* Bottom log strip */}
      <div className="flex items-center justify-between border-t border-border bg-surface-elevated/60 px-3 py-2 font-mono text-[9px] text-muted-foreground">
        <span>30 findings · 13 contradictions · 3 modules</span>
        <span>↑ 3.8s</span>
      </div>
    </div>
  );
}

function ModuleBar({
  name,
  pct,
  score,
  delay,
  tone,
}: {
  name: string;
  pct: number;
  score: number;
  delay: number;
  tone: "critical" | "high" | "medium" | "low";
}) {
  const dot =
    tone === "low"
      ? "bg-emerald-400"
      : tone === "medium"
        ? "bg-amber-400"
        : tone === "high"
          ? "bg-amber-400"
          : "bg-destructive";
  const bar =
    tone === "low"
      ? "bg-emerald-400/80"
      : tone === "critical"
        ? "bg-destructive/80"
        : "bg-foreground/80";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[10px]">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          <span className="text-foreground">{name}</span>
        </div>
        <span className="text-muted-foreground">{score}/100</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-border">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay, duration: 1, ease: "easeOut" }}
          className={`h-full ${bar}`}
        />
      </div>
    </div>
  );
}
