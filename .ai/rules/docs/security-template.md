# Vielzeug — Security Template

Static reference for `security.md` output format. Consumed by `/pkg-security` — do not duplicate in workflow files, reference here.

## Per-finding format

List every finding with:

```text
[STATUS] [SEVERITY] [CATEGORY]
File: src/foo.ts:42
Finding: <description>
Risk: <what an attacker could do>
Fix: <recommended remediation>
```

Where:

- **STATUS**: `[VULN]` = confirmed vulnerability, `[CONCERN]` = risky pattern, `[SAFE]` = explicitly checked safe area
- **SEVERITY**: `CRITICAL` | `MAJOR` | `MINOR` | `NIT` (same scale as `/pkg-review` — see `.ai/rules/process/agent-execution.md § Severity`)
- **CATEGORY**: `Input Validation`, `Injection`, `Prototype Pollution`, `Information Leakage`, `Type Safety`, `Dependency`, `Browser`, `Server/API`, or similar

When a finding is fixed during the audit, annotate it inline:

```text
[VULN] [MAJOR] [Injection] File: src/foo.ts:42 [DONE]
Finding: ...
Fix: ...
```

## `security.md` format

End with an **Audit Summary** section using **exactly this format**:

```md
## Audit Summary

### Executive Summary

<2–3 sentences: overall security posture, most significant concern, and confidence level.>

### Finding Counts

| Status | CRITICAL | MAJOR | MINOR | NIT | Total |
|--------|----------|-------|-------|-----|-------|
| [VULN] | N | N | N | N | N |
| [CONCERN] | N | N | N | N | N |
| [DONE] | N | N | N | N | N |

### Remediation Priorities

1. <highest priority finding>
2. <next>
3. <next (max 5)>

### Overall Risk Rating

🔴 Red / 🟡 Yellow / 🟢 Green / 🔵 N/A

<One sentence justifying the rating.>
```

This is a single aggregate signal, deliberately worded differently from the per-finding `CRITICAL`/`MAJOR`/`MINOR`/`NIT` severity scale above so the two are never mistaken for the same thing — "Red" doesn't mean "has a `CRITICAL`", it means "ship-blocking as a whole."

**Rating rules:**

| Condition                                   | Rating    |
| -------------------------------------------- | --------- |
| Any unfixed CRITICAL                         | 🔴 Red    |
| Unfixed MAJOR, no CRITICAL                   | 🟡 Yellow |
| Only MINOR/NIT concerns, no CRITICAL/MAJOR   | 🟢 Green  |
| No attack surface; no meaningful risks       | 🔵 N/A    |
