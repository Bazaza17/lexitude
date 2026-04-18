# Ledgerwise — Security & PCI DSS Policy

Ledgerwise processes card payments for small-business accounting platforms.
Because the browser tokenizes cards via Stripe Elements, our cardholder
data environment (CDE) is limited to Stripe payment method tokens
(`pm_...`) and the resulting charge IDs. We validate SAQ A-EP annually.

## Cardholder data handling (PCI DSS 3.x / 4.x)

- Ledgerwise **never** receives, processes, stores, or transmits raw PANs,
  CVVs, or magnetic-stripe data. All card entry is Stripe Elements.
- No cardholder data is written to logs, the database, or third-party
  analytics. The audit log's free-form `metadata` field is explicitly
  forbidden from containing PAN, CVV, or cardholder name.
- Storage in any form other than Stripe payment method tokens is a Sev-1
  incident.

## Authentication & session management (PCI DSS 8.x)

- Passwords are hashed with Argon2id (m=64MB, t=3, p=4). No plaintext or
  reversible encoding at rest.
- MFA is required for all operator accounts. No bypass flag exists.
- Sessions expire after 15 minutes of inactivity and 8 hours absolute.
- Login endpoints are rate-limited per IP (5/5min) and per user
  (10/15min). Exceeding either locks the account and pages an on-call
  operator.

## Secrets management (PCI DSS 3.5 / 3.6)

- No secrets in source control. CI enforces this via gitleaks pre-receive.
- Runtime secrets are fetched from the secrets manager into env at pod
  start; rotation is quarterly (automated) and on any suspected exposure.

## Logging & monitoring (PCI DSS 10.x)

- Every authentication event, charge, refund, dispute, and admin action
  is recorded in the tamper-evident `audit_log` table (HMAC chain).
- A nightly verifier walks the chain; a break pages the security on-call.
- Raw IPs are never stored — we hash (SHA-256 + pepper) before writing.

## API protection (PCI DSS 6.6)

- CORS is origin-allowlist only — no wildcard, no null. Preflight is
  limited to the allowed methods and headers.
- All cardholder-data-adjacent endpoints enforce the full security
  header set (HSTS preload, CSP `default-src 'self'`, X-Frame-Options
  DENY, X-Content-Type-Options nosniff).
- All SQL uses parameterized statements — string interpolation into SQL
  is forbidden by ESLint rule `no-restricted-syntax`.

## Testing & change control (PCI DSS 6.x / 11.3)

- External penetration testing is performed quarterly and after any
  significant change to the CDE. Findings are tracked to remediation in
  the security issue tracker.
- Change control: every production deploy requires a signed-off security
  review for any file touching `app/api/payments/`, `lib/audit-log.ts`,
  `lib/session.ts`, or `middleware.ts`.
