# Compliance Mapping (Baseline)

This document maps implemented controls to common frameworks for audit readiness.

## SOC 2 (selected controls)

- **CC6 Logical access**
  - Firebase auth on client and Firebase Admin token verification on server endpoints handling protected sync/restore.
- **CC7 Operations**
  - Request correlation (`x-request-id`), centralized route error handling, and CI security scans.
- **CC8 Change management**
  - GitHub Actions quality and security gates before merge/release.

## PCI-DSS (selected controls)

- **Req 6 Secure development**
  - Zod input validation and shared public API shell for public routes.
- **Req 10/11 Monitoring and testing**
  - CI tests + security workflow (audit, secret scan, SAST).
- **Req 4 Transmission protection**
  - HSTS and browser-facing security headers configured in Next.js.

## GDPR (selected controls)

- **Art 25/32 Security by design**
  - Server-side validation, auth checks, and rate limiting controls.
- **Operational gap**
  - Formal procedures for data portability and erasure should be documented before claiming full readiness.

## HIPAA (selected controls)

- **Access and audit support**
  - Authenticated endpoint controls and request correlation.
- **Operational gap**
  - Formal policy/process controls (key management, breach reporting process) require dedicated governance artifacts.

## Known gaps

- No formal compliance automation scoring pipeline yet.
- No centralized policy repository (acceptable for current stage; add before formal certification efforts).

