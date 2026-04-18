const steps = [
  {
    n: "01",
    title: "Configure",
    desc: "Name the company, pick SOC 2, GDPR, or HIPAA, point at a GitHub repo, and drop in your policy documents.",
    code: `framework: SOC2
repo: github.com/acme/backend
policies: handbook.pdf, ai_usage.md`,
  },
  {
    n: "02",
    title: "Analyze",
    desc: "Three Claude-powered modules run in sequence: Code Compliance, Policy Intelligence, and Risk Surface — all streaming.",
    code: `module 1 → 30 findings · 17 critical
module 2 → 13 conflicts · 4 gaps
module 3 → synthesized risk`,
  },
  {
    n: "03",
    title: "Act",
    desc: "Get a scored dashboard, the top insight your policy promised and your code violates, and downloadable evidence for your auditor.",
    code: `overall: 34/100 · critical
top insight: policy ↔ code
export: lexitude-finovabank.json`,
  },
];

export function Workflow() {
  return (
    <section id="workflow" className="border-b border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              — Workflow
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              From scattered repo and PDFs to auditor-ready in minutes.
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="flex flex-col bg-background p-6">
              <div className="mb-6 flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">{s.n}</span>
                <span className="mx-3 h-px flex-1 bg-border" />
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
              </div>
              <h3 className="text-lg font-medium">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              <pre className="mt-6 overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {s.code}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
