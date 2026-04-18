export type Framework = "SOC2" | "GDPR" | "HIPAA";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type Severity = RiskLevel;

export type CodeFinding = {
  file: string;
  line: number | null;
  severity: Severity;
  category: string;
  controlId?: string | null;
  issue: string;
  recommendation: string;
};

export type CodeResult = {
  score: number;
  riskLevel: RiskLevel;
  summary: string;
  findings: CodeFinding[];
  stats?: {
    filesAnalyzed: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
};

export type PolicyConflict = {
  docs: string[];
  severity: Severity;
  controlId?: string | null;
  issue: string;
  recommendation: string;
};

export type PolicyGap = {
  requirement: string;
  severity: Severity;
  controlId?: string | null;
  issue: string;
  recommendation: string;
};

export type CodeVsPolicy = {
  policy: string;
  policyDoc: string;
  code: string;
  codeLocation: string;
  controlId?: string | null;
  severity: Severity;
};

export type PolicyResult = {
  score: number;
  riskLevel: RiskLevel;
  summary: string;
  conflicts: PolicyConflict[];
  gaps: PolicyGap[];
  codeVsPolicyConflicts: CodeVsPolicy[];
};

export type TopInsight = {
  title: string;
  severity: Severity;
  controlId?: string | null;
  description: string;
  evidence: string[];
};

export type PriorityAction = {
  rank: number;
  title: string;
  owner: string;
  timeframe: string;
  controlIds?: string[];
  closes: string[];
};

export type RiskResult = {
  overallScore: number;
  riskLevel: RiskLevel;
  executiveSummary: string;
  topInsights: TopInsight[];
  priorityActions: PriorityAction[];
};

export type ReviewHallucination = {
  source: "code" | "policy" | "risk";
  issue: string;
  severity: Severity;
};

export type ReviewMiscalibration = {
  source: "code" | "policy" | "risk";
  finding: string;
  originalSeverity: Severity;
  suggestedSeverity: Severity;
  rationale: string;
};

export type ReviewMissedRisk = {
  title: string;
  severity: Severity;
  controlId?: string | null;
  description: string;
};

export type ReviewActionNow = {
  rank: number;
  title: string;
  why: string;
  controlIds?: string[];
};

export type ReviewDefer = {
  title: string;
  why: string;
};

export type RepoSnapshotFlag = {
  severity: Severity;
  flag: string;
  why: string;
};

export type RepoSnapshot = {
  stack: string;
  surface: string;
  firstImpression: string;
  quickFlags: RepoSnapshotFlag[];
};

export type ReviewResult = {
  confidence: "low" | "medium" | "high";
  adjustedScore: number;
  adjustedRiskLevel: RiskLevel;
  verdict: string;
  hallucinations: ReviewHallucination[];
  miscalibrations: ReviewMiscalibration[];
  missedRisks: ReviewMissedRisk[];
  actNow: ReviewActionNow[];
  defer: ReviewDefer[];
};

export type AuditRunRow = {
  id: string;
  created_at: string;
  company_name: string;
  framework: Framework;
  repo_url: string | null;
  repo_branch: string | null;
  file_count: number | null;
  doc_count: number | null;
  code_result: CodeResult | null;
  policy_result: PolicyResult | null;
  risk_result: RiskResult | null;
  review_result: ReviewResult | null;
  overall_score: number | null;
  risk_level: RiskLevel | null;
};
