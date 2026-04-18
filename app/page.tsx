import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6">
      <section className="flex flex-1 flex-col justify-center py-24">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          Enterprise AI Readiness · v0.1
        </p>
        <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
          The compliance audit your written policy doesn&apos;t tell you about.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          AuditAI reads your code, reads your policies, and surfaces the gaps
          between what you wrote down and what your systems actually do. In
          minutes, not quarters.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/new"
            className="inline-flex items-center bg-black px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Start an audit →
          </Link>
          <Link
            href="/history"
            className="inline-flex items-center border border-zinc-300 px-5 py-3 text-sm font-medium hover:border-black dark:border-zinc-700 dark:hover:border-white"
          >
            View past runs
          </Link>
        </div>
      </section>

      <section className="grid gap-px border border-zinc-200 bg-zinc-200 md:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-800">
        <Module
          number="01"
          title="Code Compliance"
          body="Ingests a GitHub repository and scores it against SOC 2, GDPR, or HIPAA. Surfaces hardcoded secrets, PII in logs, injection vectors, auth bypasses, and AI-governance gaps."
        />
        <Module
          number="02"
          title="Policy Intelligence"
          body="Reads your employee handbook, data-privacy policy, and AI-usage policy. Flags internal conflicts, missing clauses, and undertested commitments."
        />
        <Module
          number="03"
          title="Risk Surface"
          body="Cross-references code behavior with written policy and returns the contradictions. The top insight is typically the one your policy promised and your code violates."
        />
      </section>

      <section className="py-16">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          Why it matters
        </p>
        <p className="mt-4 max-w-3xl text-xl leading-8 text-zinc-700 dark:text-zinc-300">
          A company that writes &ldquo;we never log PII&rdquo; and then logs
          SSNs in production isn&apos;t non-compliant. It&apos;s a lawsuit.
          AuditAI finds the lawsuit before it finds you.
        </p>
      </section>
    </div>
  );
}

function Module({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-white p-8 dark:bg-black">
      <p className="font-mono text-xs text-zinc-500">{number}</p>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {body}
      </p>
    </div>
  );
}
