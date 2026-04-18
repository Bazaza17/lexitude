# NovoGen Health — HIPAA Privacy & Security Policy

**Version:** 3.2
**Effective:** 2024-07-01
**Owner:** Privacy Officer (CISO's office)

## 1. Purpose

NovoGen Health is a covered entity under HIPAA. This policy defines the administrative, physical, and technical safeguards that protect Protected Health Information (PHI) and electronic PHI (ePHI) handled by our genomics and clinical-decision-support platform.

## 2. Scope

This policy applies to all workforce members, all NovoGen systems, and all third parties processing PHI on our behalf.

## 3. Technical safeguards

### 3.1 Encryption

- All PHI **must** be encrypted at rest using AES-256. Database columns that hold SSNs, DOBs, diagnoses, and raw genomic variant data must use field-level encryption.
- All PHI **must** be encrypted in transit using TLS 1.2 or higher. Plaintext database connections are prohibited, including on internal VPC networks.

### 3.2 Access control

- Each workforce member must have a unique user identifier. Shared or service accounts must not be used to access patient records directly (45 CFR §164.312(a)(2)(i)).
- Role-based access control is enforced at the API layer. Patient-record endpoints must authenticate the caller and authorize them against the patient's care team.
- Automatic session logoff is required after **15 minutes** of inactivity (§164.312(a)(2)(iii)).

### 3.3 Audit controls

- Every access, creation, modification, or deletion of a patient record must be recorded in the tamper-evident audit log (§164.312(b)) with the user identifier, timestamp, record ID, and action.
- Audit logs are retained for six years and reviewed monthly by the Privacy Officer.

### 3.4 Client-side storage

- PHI **must never** be written to `localStorage`, `sessionStorage`, cookies, IndexedDB, or any other client-persisted store. Forms that collect PHI must not "auto-save" drafts to the browser.

## 4. Third-party sharing

- PHI may only be disclosed to a third party covered by a signed Business Associate Agreement (BAA).
- PHI sent to foundation-model APIs (including Anthropic, OpenAI, and others) must be de-identified per §164.514 before transmission. The workforce member triggering the call is responsible for verifying de-identification.

## 5. Breach notification

- Any suspected PHI exposure must be reported to the Privacy Officer within two business hours.
- NovoGen will notify affected individuals within 60 days per §164.404.

## 6. Workforce training

- All new workforce members complete HIPAA training within 30 days of hire and annually thereafter.
- Engineering staff complete an additional secure-coding module.

## 7. Enforcement

Violations may result in disciplinary action up to and including termination and, in cases of willful neglect, referral for criminal prosecution under HITECH.
