# FinovaBank — Responsible AI Usage Policy

**Effective:** February 15, 2026
**Owner:** Office of the Chief Risk Officer, in coordination with Legal and the
Data Protection Officer (DPO).
**Applies to:** All AI/ML systems developed, deployed, or integrated by
FinovaBank, including third-party foundation models accessed via API.

---

## 1. Purpose

This policy governs the safe and compliant use of artificial intelligence at
FinovaBank. It reflects our obligations under emerging AI regulation,
SOC 2 trust criteria, and our duty of care to customers who rely on our
advice and services.

## 2. Scope

All customer-facing and employee-facing AI features, including chat assistants,
recommendation systems, fraud detection models, and any generative AI
integrated into customer journeys.

## 3. Requirements

### 3.1 Human Review of Customer-Facing AI Output
Any AI-generated output that will be displayed to a customer **MUST** be
reviewed by a qualified human reviewer before delivery, OR pass through an
approved guardrails service that performs policy, safety, and hallucination
checks. Fully autonomous customer-facing generation is prohibited.

### 3.2 Prohibition on AI Financial Advice
FinovaBank AI systems **MUST NOT** provide personalized investment, tax,
retirement, or financial planning advice to customers. Regulated advice must
come from a licensed human advisor. AI systems may provide general educational
content only, and must include clear disclaimers that the content is not advice.

### 3.3 Customer Data Sent to Third-Party AI Providers
Sending customer PII, payment card data, or account details to any third-party
AI vendor (including foundation-model APIs such as Anthropic, OpenAI, Google)
requires:
(a) prior written approval from the DPO and the CRO, and
(b) a signed zero-retention agreement with the vendor, and
(c) redaction of direct identifiers before transmission where technically
feasible.

Sending raw SSNs, card numbers, or full account balances to a foundation-model
API is **prohibited**.

### 3.4 Prompt and Model Change Control
System prompts that govern AI behavior in customer-facing products are
configuration-controlled artifacts. Changes require peer review, Legal
sign-off, and a 7-day observation window in staging before production.

### 3.5 Output Logging and Audit Trail
All AI interactions with customers must be logged with a full audit trail
(prompt, output, model version, reviewer) retained for 7 years to support
regulatory inquiry.

### 3.6 Rate Limiting and Abuse Protection
Customer-facing AI endpoints must enforce per-user rate limits and abuse
detection. Unauthenticated access to AI endpoints is prohibited.

## 4. Governance

The AI Governance Committee (CRO, CTO, DPO, General Counsel) reviews all
new AI deployments quarterly. Violations are reported to the Board Risk
Committee.
