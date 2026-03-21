# Incident Response Runbook

This runbook defines the default response flow for security incidents in Norsk Tutor.

## Severity levels

- **SEV-1**: active exploitation, data exposure, or production outage tied to security.
- **SEV-2**: confirmed vulnerability with elevated risk, no confirmed exploitation.
- **SEV-3**: suspected issue or low-impact security event.

## Phase 1: Detect and triage (0-15 min)

1. Acknowledge alert and assign incident owner.
2. Classify severity (SEV-1/2/3).
3. Create incident timeline and communication channel.

## Phase 2: Contain (15-60 min)

1. Isolate affected component or endpoint.
2. Revoke/rotate potentially compromised credentials.
3. Preserve evidence (relevant logs, request IDs, CI artifacts).

## Phase 3: Eradicate (1-4 hours)

1. Identify root cause.
2. Patch code/config/dependency issue.
3. Re-run security gates:
   - `npm audit --omit=dev --audit-level=high`
   - `.github/workflows/security.yml` checks

## Phase 4: Recover (4-24 hours)

1. Restore service and monitor for recurrence.
2. Verify key user flows and API health checks.
3. Confirm no new high/critical findings.

## Phase 5: Post-incident (24-72 hours)

1. Publish timeline and root-cause analysis.
2. Document corrective and preventive actions.
3. Update tests/runbooks/policies as needed.

## Escalation policy

- Escalate immediately for SEV-1 incidents.
- Notify stakeholders when user data, auth, or payment routes are impacted.
- Treat unresolved high-risk findings as release blockers.

