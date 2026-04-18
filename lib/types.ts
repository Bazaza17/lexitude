export type Framework = "SOC2" | "GDPR" | "HIPAA";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type Severity = RiskLevel;

export type CodeFinding = {
  file: string;
  line: number | null;
  severity: Severity;
  category: string;
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
  issue: string;
  recommendation: string;
};

export type PolicyGap = {
  requirement: string;
  severity: Severity;
  issue: string;
  recommendation: string;
};

export type CodeVsPolicy = {
  policy: string;
  policyDoc: string;
  code: string;
  codeLocation: string;
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
  description: string;
  evidence: string[];
};

export type PriorityAction = {
  rank: number;
  title: string;
  owner: string;
  timeframe: string;
  closes: string[];
};

export type RiskResult = {
  overallScore: number;
  riskLevel: RiskLevel;
  executiveSummary: string;
  topInsights: TopInsight[];
  priorityActions: PriorityAction[];
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
  overall_score: number | null;
  risk_level: RiskLevel | null;
};
