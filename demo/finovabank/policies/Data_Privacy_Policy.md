# FinovaBank — Data Privacy & Information Security Policy

**Effective:** January 1, 2026
**Owner:** Office of the Chief Privacy Officer
**Applies to:** All FinovaBank systems, employees, and contractors handling customer data.

---

## 1. Purpose

FinovaBank is committed to the highest standards of customer data protection.
This policy defines the controls we apply to personally identifiable information
(PII), payment card data, and other sensitive customer records, consistent with
SOC 2 Type II and our contractual obligations to banking partners.

## 2. Definitions

- **PII** includes, without limitation: full name, Social Security Number (SSN),
  date of birth, government-issued ID numbers, home address, and tax
  identification numbers.
- **Payment card data** includes the primary account number (PAN), CVV/CVC,
  expiration date, and cardholder name.

## 3. Data Handling Principles

### 3.1 Logging and Observability
FinovaBank systems **MUST NEVER** write PII or payment card data to application
logs, error-reporting systems, or analytics pipelines. Log lines must be
reviewed for leakage before a service is promoted to production.

### 3.2 Encryption
All PII and payment card data **MUST** be encrypted at rest using AES-256 and
in transit using TLS 1.2 or higher. Database fields containing SSNs, card
numbers, and tax IDs must be encrypted at the field level using our managed
KMS.

### 3.3 Cardholder Data
Payment card numbers and CVVs **MUST NOT** be stored on customer devices,
browser storage (localStorage, sessionStorage, cookies), or any
non-PCI-certified system. All card numbers shall be tokenized via our
payment processor before any further processing.

### 3.4 Third-Party Data Sharing
Sharing any customer PII with third-party analytics, advertising, or data
processors requires:
(a) explicit, prior, informed consent from the customer, and
(b) a signed Data Processing Addendum reviewed by Legal.

Marketing, advertising, and behavioral-analytics vendors are **not** approved
recipients of PII under any circumstances.

### 3.5 Access Controls
Production credentials — including database passwords, API keys, and webhook
secrets — **MUST NOT** appear in source code, configuration files committed to
version control, or internal documentation. Credentials shall be managed via
AWS Secrets Manager with quarterly rotation.

### 3.6 Query Safety
All database queries involving user-controlled input **MUST** use parameterized
queries or an approved ORM. String concatenation of user input into SQL is
prohibited.

## 4. Enforcement

Violations of this policy may result in disciplinary action up to and including
termination and referral to regulators. Engineering Leadership is responsible
for automated detection of violations via static analysis in CI.
