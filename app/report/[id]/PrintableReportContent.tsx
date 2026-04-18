"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { frameworkDisplayName } from "@/lib/types";
import type { AuditRunRow, Severity } from "@/lib/types";

export default function PrintableReportContent({ id }: { id: string }) {
  const search = useSearchParams();
  const autoprint = search.get("autoprint") === "1";

  const [run, setRun] = useState<AuditRunRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  // Trigger print dialog once content has painted.
  useEffect(() => {
    if (!autoprint || !run) return;
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, [autoprint, run]);

  if (err) {
    return (
      <div className="report-page">
        <p className="error">Unable to load run: {err}</p>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="report-page">
        <p>Loading report…</p>
      </div>
    );
  }

  const code = run.code_result;
  const policy = run.policy_result;
  const risk = run.risk_result;
  const review = run.review_result;

  const headlineScore =
    review?.adjustedScore ?? risk?.overallScore ?? run.overall_score ?? null;
  const headlineLevel =
    review?.adjustedRiskLevel ?? risk?.riskLevel ?? run.risk_level ?? null;
  const headlineSummary = review?.verdict ?? risk?.executiveSummary ?? null;

  return (
    <div className="report-root">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          color-scheme: light;
        }
        html,
        body {
          background: #ffffff !important;
          color: #0b0d10 !important;
          font-family:
            "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
        }
        body {
          margin: 0;
        }
        .report-root {
          max-width: 860px;
          margin: 0 auto;
          padding: 48px 56px;
          line-height: 1.5;
          font-size: 14px;
          color: #0b0d10;
        }
        .report-root h1 {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.01em;
          margin: 0 0 4px;
        }
        .report-root h2 {
          font-size: 18px;
          font-weight: 700;
          margin: 32px 0 12px;
          padding-bottom: 6px;
          border-bottom: 1px solid #d4d4d4;
        }
        .report-root h3 {
          font-size: 14px;
          font-weight: 600;
          margin: 16px 0 6px;
        }
        .report-root p {
          margin: 0 0 8px;
        }
        .report-root .muted {
          color: #5c6066;
          font-size: 12px;
        }
        .report-root .meta {
          font-family: "Geist Mono", ui-monospace, SFMono-Regular, Consolas,
            monospace;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.08em;
          color: #5c6066;
        }
        .report-root .cover {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 32px;
          align-items: end;
          padding-bottom: 24px;
          border-bottom: 2px solid #0b0d10;
        }
        .report-root .score-block {
          text-align: right;
        }
        .report-root .score {
          font-size: 64px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .report-root .score-unit {
          font-family: "Geist Mono", monospace;
          color: #5c6066;
          font-size: 14px;
          margin-left: 2px;
        }
        .report-root .risk-pill {
          display: inline-block;
          margin-top: 6px;
          padding: 2px 8px;
          border: 1px solid;
          border-radius: 4px;
          font-family: "Geist Mono", monospace;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.14em;
        }
        .report-root .severity-critical {
          border-color: #a31111;
          background: #fbebea;
          color: #7a0d0d;
        }
        .report-root .severity-high {
          border-color: #a66510;
          background: #fdf0dc;
          color: #7f4d0b;
        }
        .report-root .severity-medium {
          border-color: #8a6d15;
          background: #fbf3d7;
          color: #6b540f;
        }
        .report-root .severity-low {
          border-color: #1f6e43;
          background: #e3f3ea;
          color: #175434;
        }
        .report-root .kv-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
          margin-top: 20px;
        }
        .report-root .kv {
          border: 1px solid #d4d4d4;
          border-radius: 6px;
          padding: 10px 14px;
        }
        .report-root .kv .label {
          font-family: "Geist Mono", monospace;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.12em;
          color: #5c6066;
        }
        .report-root .kv .value {
          font-size: 20px;
          font-weight: 700;
          margin-top: 4px;
        }
        .report-root .insight,
        .report-root .action,
        .report-root .gap,
        .report-root .conflict {
          border: 1px solid #d4d4d4;
          border-radius: 6px;
          padding: 12px 14px;
          margin-bottom: 10px;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .report-root .insight-head,
        .report-root .action-head,
        .report-root .gap-head {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          margin-bottom: 6px;
        }
        .report-root .control-chip {
          font-family: "Geist Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.06em;
          padding: 2px 6px;
          border: 1px solid #d4d4d4;
          border-radius: 4px;
          background: #f5f5f5;
          color: #3b3f44;
        }
        .report-root .verdict-box {
          border-left: 3px solid #0b0d10;
          padding: 8px 14px;
          background: #f5f5f5;
          margin: 12px 0;
          font-size: 14px;
          line-height: 1.55;
        }
        .report-root ul {
          margin: 4px 0 0 0;
          padding-left: 20px;
        }
        .report-root .toolbar {
          position: fixed;
          top: 16px;
          right: 16px;
          display: flex;
          gap: 8px;
        }
        .report-root .toolbar button {
          padding: 6px 12px;
          border: 1px solid #0b0d10;
          background: #0b0d10;
          color: #ffffff;
          font-family: "Geist Mono", monospace;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.1em;
          border-radius: 4px;
          cursor: pointer;
        }
        .report-root .toolbar button.secondary {
          background: #ffffff;
          color: #0b0d10;
        }
        .report-root .summary-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        .report-root .summary-table th,
        .report-root .summary-table td {
          text-align: left;
          padding: 6px 8px;
          border-bottom: 1px solid #e4e4e4;
          font-size: 12px;
        }
        .report-root .summary-table th {
          font-family: "Geist Mono", monospace;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #5c6066;
          font-weight: 500;
        }
        @media print {
          .report-root {
            max-width: none;
            padding: 24px;
          }
          .toolbar {
            display: none !important;
          }
          h2 {
            page-break-after: avoid;
          }
          .insight,
          .action,
          .gap,
          .conflict {
            page-break-inside: avoid;
          }
        }
        @page {
          size: Letter;
          margin: 0.75in;
        }
      ` }} />

      <div className="toolbar">
        <button
          type="button"
          className="secondary"
          onClick={() => window.close()}
          aria-label="Close report tab"
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          aria-label="Print or save as PDF"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="cover">
        <div>
          <p className="meta">
            {frameworkDisplayName(run.framework)} audit · {new Date(run.created_at).toLocaleString()}
          </p>
          <h1>{run.company_name}</h1>
          <p className="muted">
            Report generated by Lexitude · Code Haiku 4.5 · Policy Sonnet 4.6 ·
            Risk Opus 4.7 · Reviewer Sonnet 4.6
          </p>
        </div>
        <div className="score-block">
          <div>
            <span className="score">
              {typeof headlineScore === "number" ? headlineScore : "—"}
            </span>
            <span className="score-unit">/100</span>
          </div>
          {headlineLevel && (
            <span className={`risk-pill severity-${headlineLevel}`}>
              {headlineLevel}
            </span>
          )}
        </div>
      </div>

      <h2>Executive summary</h2>
      {headlineSummary ? (
        <div className="verdict-box">{headlineSummary}</div>
      ) : (
        <p className="muted">No executive summary produced.</p>
      )}

      <div className="kv-grid">
        <div className="kv">
          <p className="label">Code score</p>
          <p className="value">
            {typeof code?.score === "number" ? `${code.score}/100` : "—"}
          </p>
          <p className="muted">
            {code
              ? `${code.findings.length} findings · ${code.stats?.criticalCount ?? 0} critical · ${code.stats?.highCount ?? 0} high`
              : "no code audit"}
          </p>
        </div>
        <div className="kv">
          <p className="label">Policy score</p>
          <p className="value">
            {typeof policy?.score === "number" ? `${policy.score}/100` : "—"}
          </p>
          <p className="muted">
            {policy
              ? `${policy.conflicts.length} conflicts · ${policy.gaps.length} gaps`
              : "no policy audit"}
          </p>
        </div>
        <div className="kv">
          <p className="label">Reviewer confidence</p>
          <p className="value">
            {review ? review.confidence : "—"}
          </p>
          <p className="muted">
            {review
              ? `${review.actNow.length} act-now · ${review.missedRisks.length} missed`
              : "no reviewer pass"}
          </p>
        </div>
      </div>

      {risk && risk.topInsights.length > 0 && (
        <>
          <h2>Top insights</h2>
          {risk.topInsights.map((i, idx) => (
            <div key={idx} className="insight">
              <div className="insight-head">
                <span className="meta">#{idx + 1}</span>
                <span className={`risk-pill severity-${i.severity}`}>
                  {i.severity}
                </span>
                {i.controlId && <span className="control-chip">{i.controlId}</span>}
              </div>
              <h3>{i.title}</h3>
              <p>{i.description}</p>
              {i.evidence.length > 0 && (
                <ul>
                  {i.evidence.map((e, ei) => (
                    <li key={ei}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </>
      )}

      {review && review.actNow.length > 0 && (
        <>
          <h2>Act this week</h2>
          {review.actNow.map((a, idx) => (
            <div key={idx} className="action">
              <div className="action-head">
                <span className="meta">#{a.rank}</span>
                {a.controlIds?.map((c, ci) => (
                  <span key={ci} className="control-chip">
                    {c}
                  </span>
                ))}
              </div>
              <h3>{a.title}</h3>
              <p>{a.why}</p>
            </div>
          ))}
        </>
      )}

      {risk && risk.priorityActions.length > 0 && (
        <>
          <h2>Priority actions</h2>
          {risk.priorityActions.map((a, idx) => (
            <div key={idx} className="action">
              <div className="action-head">
                <span className="meta">
                  #{a.rank} · {a.timeframe} · Owner: {a.owner}
                </span>
                {a.controlIds?.map((c, ci) => (
                  <span key={ci} className="control-chip">
                    {c}
                  </span>
                ))}
              </div>
              <h3>{a.title}</h3>
              {a.closes?.length > 0 && (
                <p className="muted">
                  Closes {a.closes.length}{" "}
                  {a.closes.length === 1 ? "insight" : "insights"}
                </p>
              )}
            </div>
          ))}
        </>
      )}

      {policy && (policy.gaps.length > 0 || policy.codeVsPolicyConflicts.length > 0) && (
        <>
          <h2>Policy issues</h2>
          {policy.codeVsPolicyConflicts.map((c, idx) => (
            <div key={`cvp-${idx}`} className="conflict">
              <div className="gap-head">
                <span className={`risk-pill severity-${c.severity}`}>
                  {c.severity}
                </span>
                {c.controlId && <span className="control-chip">{c.controlId}</span>}
                <span className="meta">
                  {c.policyDoc} ↔ {c.codeLocation}
                </span>
              </div>
              <p>
                <strong>Policy says:</strong> {c.policy}
              </p>
              <p>
                <strong>Code does:</strong> {c.code}
              </p>
            </div>
          ))}
          {policy.gaps.map((g, idx) => (
            <div key={`gap-${idx}`} className="gap">
              <div className="gap-head">
                <span className={`risk-pill severity-${g.severity}`}>
                  {g.severity}
                </span>
                {g.controlId && <span className="control-chip">{g.controlId}</span>}
                <span className="meta">{g.requirement}</span>
              </div>
              <p>{g.issue}</p>
              <p className="muted">→ {g.recommendation}</p>
            </div>
          ))}
        </>
      )}

      {code && code.findings.length > 0 && (
        <>
          <h2>Code findings ({code.findings.length})</h2>
          <table className="summary-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Control</th>
                <th>File</th>
                <th>Issue</th>
              </tr>
            </thead>
            <tbody>
              {[...code.findings]
                .sort(
                  (a, b) =>
                    severityRank(a.severity) - severityRank(b.severity),
                )
                .map((f, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className={`risk-pill severity-${f.severity}`}>
                        {f.severity}
                      </span>
                    </td>
                    <td>
                      {f.controlId ? (
                        <span className="control-chip">{f.controlId}</span>
                      ) : null}
                    </td>
                    <td>
                      <span className="meta" style={{ textTransform: "none" }}>
                        {f.file}
                        {f.line ? `:${f.line}` : ""}
                      </span>
                    </td>
                    <td>
                      {f.issue}
                      <br />
                      <span className="muted">→ {f.recommendation}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}

      <p className="muted" style={{ marginTop: 40 }}>
        End of report · Generated {new Date().toLocaleString()} · Lexitude
      </p>
    </div>
  );
}

function severityRank(s: Severity): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[s];
}
