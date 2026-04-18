# NovoGen Health — AI Clinical Use Policy

**Version:** 1.1
**Effective:** 2025-01-15
**Owner:** Chief Medical Officer

## 1. Purpose

This policy governs the use of AI (including large language models, foundation models, and machine-learning inference services) in NovoGen Health products that interact with patients, clinicians, or PHI.

## 2. Principles

NovoGen's AI systems are *decision-support* tools. They do not and must not act as autonomous medical providers. Every AI output that will be surfaced to a patient or used to inform care must have a licensed clinician in the loop before publication.

## 3. Requirements

### 3.1 Clinician review
- AI-generated clinical interpretations — including genomic variant interpretations, risk scores, and treatment suggestions — **must** be reviewed and signed off by a board-certified clinician before being shown to a patient.
- Streaming raw model output directly to the patient interface is prohibited.

### 3.2 Scope constraints
- AI systems **must not** produce diagnostic conclusions. Language that states a definitive diagnosis is forbidden in system prompts and must be post-filtered from outputs.
- AI systems **must not** produce specific treatment recommendations (drugs, dosages, procedures). Lifestyle information may be produced with a clinician sign-off.

### 3.3 PHI handling in AI calls
- No PHI may be sent to a foundation-model API without de-identification per §164.514. Patient name, DOB, MRN, precise genomic variant positions, and facial images must all be removed or pseudonymized.
- De-identification must be performed server-side. The client must not be trusted to de-identify.

### 3.4 Disclaimer and consent
- The patient must complete an AI consent flow before any AI-assisted interaction. The flow must describe what data will be processed by the AI and the involvement of the clinician.
- Every AI response shown to the patient must include a disclosure that the content was AI-generated and clinician-reviewed, with the reviewing clinician's name.

### 3.5 Model provider governance
- Foundation-model providers used in production must be covered by an executed BAA prior to processing any PHI.
- Model version, provider, and invocation metadata must be recorded in the audit log for each AI interaction.

## 4. Responsibilities

| Role | Responsibility |
|---|---|
| CMO | Owns this policy and approves AI feature launches. |
| Engineering Lead | Implements PHI de-identification and clinician-review gating. |
| Privacy Officer | Verifies BAA coverage and audit-log completeness. |
| On-call clinician | Reviews and signs off AI interpretations before delivery. |

## 5. Exceptions

Exceptions require written approval from the CMO and Privacy Officer. No standing exception for research use exists.

## 6. Review

This policy is reviewed annually and after any material change to the AI stack.
