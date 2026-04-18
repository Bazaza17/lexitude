const features = [
  {
    tag: "01",
    title: "Repository ingestion",
    desc: "Point Lexitude at a GitHub repo. We fetch code, walk the tree, and prepare it for analysis — no cloning, no server setup.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-3.16 19.5c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.1-1.46-1.1-1.46-.9-.62.07-.6.07-.6 1 .07 1.52 1.03 1.52 1.03.88 1.52 2.32 1.08 2.88.82.09-.65.34-1.08.62-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.55 9.55 0 0 1 5 0c1.9-1.29 2.74-1.02 2.74-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.69-4.57 4.94.36.31.67.92.67 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    tag: "02",
    title: "Policy parsing",
    desc: "Upload PDFs, markdown, or paste raw text. Lexitude extracts clauses and turns them into structured, scannable commitments.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 4h11l3 3v13H5V4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M8 11h8M8 15h6M8 7h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tag: "03",
    title: "Framework-aware scoring",
    desc: "Claude scores your code against SOC 2, GDPR, or HIPAA — not a checklist, a real reading of what each framework actually requires.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l8 4v6c0 5-3.5 7.5-8 8-4.5-.5-8-3-8-8V7l8-4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    tag: "04",
    title: "Policy ↔ code cross-reference",
    desc: "The heart of Lexitude. We find every contradiction between what your docs promise and what your code does — with exact file and line numbers.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 9l-4 3 4 3M17 9l4 3-4 3M14 4l-4 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    tag: "05",
    title: "Streaming narration",
    desc: "Every module streams its reasoning live. You watch Claude think, not stare at a spinner while a black box churns.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6h13M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tag: "06",
    title: "Downloadable evidence",
    desc: "Every run is stored in Supabase with full findings, conflicts, insights, and priority actions. Export the raw JSON for your auditor.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3v12M7 10l5 5 5-5M5 21h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function Features() {
  return (
    <section id="features" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 max-w-2xl">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            — Capabilities
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            The compliance pass an auditor would do,
            <br />
            <span className="text-muted-foreground">if you could afford to have them read everything.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 border-t border-l border-border md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.tag}
              className="group relative border-b border-r border-border p-6 transition-colors hover:bg-surface"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-foreground">
                  {f.icon}
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">{f.tag}</span>
              </div>
              <h3 className="text-base font-medium text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
