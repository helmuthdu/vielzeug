# pkg-security — Security Audit

> **Canonical source:** This file is the single source of truth for all AI tools. Generated, gitignored stubs in `.claude/commands/` and `.devin/workflows/` delegate here (see `.ai/workflows/manifest.json` + `pnpm gen:workflow-docs`); `.junie/guidelines.md` links here directly with no stub file.

You are a security engineer auditing a **Vielzeug** TypeScript library package.

## 0. Agent execution model

Follow `.ai/rules/agent-execution.md` — universal principles, decision framework, anti-patterns, markers, and convergence rules.

### Workflow-specific markers

| Marker      | Meaning                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------- |
| `[VULN]`    | Confirmed vulnerability                                                                  |
| `[CONCERN]` | Risky pattern — may be exploitable in certain usage                                      |
| `[SAFE]`    | Area explicitly checked and confirmed safe (use sparingly — only noteworthy clean areas) |

### Execution checkpoints

After each pass, output a checkpoint before proceeding:

```
✅ CHECKPOINT: Pass N — <Surface> complete
- Checklist items reviewed: N
- Findings: N (X [VULN], Y [CONCERN])
- By severity: C CRITICAL, M MAJOR, Mi MINOR, N NIT
- Breaking escalations: [list or "none"]
- Proceeding to Pass N+1 / Writing security.md
```

## 1. Context

See `.ai/rules/agent-execution.md § Context pointers` and `§ DOX chain`.

These are **client-side and universal TypeScript libraries** — no server-side secrets by default, but they may be used in both browser and Node environments. Zero external runtime dependencies in most packages — the attack surface is largely the package's own code and how callers use it. (`refine` bundles `lucide`; audit its declared deps under "Dependency Risks".)

Assume **untrusted user input can reach any public API** of this package.

## 2. Security mindset

Throughout the audit:

- **Flag unsafe patterns even if not currently exploitable** — future usage may create an exploit path. Default to `[CONCERN]`, not `[SAFE]`.
- Prefer **secure-by-default designs** over opt-in security.
- Validate that **escape hatches** (raw HTML, direct DOM access, `eval`-like behaviour) are justified, well-documented, and secured.
- Look for **hardcoded secrets, tokens, or credentials**, even if test-only or seemingly innocuous.
- Treat untrusted data as potentially hostile in all contexts (DOM, URLs, storage, logs, messages, etc.).
- **Breaking-change escalation:** if a `[VULN]` finding can only be remediated by a breaking API change, do **not** silently apply it. Use `[ESCALATE]` — present the finding, proposed fix, and affected call sites — then wait.

## 3. Preparation

**Before auditing**, read `runs/<name>/plan.md` if it exists. Changes made in Phase 2 may have introduced new attack surfaces — pay extra attention to plan items that touched input handling, error messages, user-controlled data, or external API interactions. Do not limit the audit to changed areas only; this is a full audit, but use the plan to prioritise where to look first.

## 4. Three-pass audit workflow

### Pass 1 — Input, Injection & Prototype Pollution

**Goal:** Find all paths where attacker-controlled data enters the package and can cause harm.

#### Input Validation & Injection

- Are user-supplied strings ever passed to `eval`, `Function()`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or `document.write`?
- Is `JSON.parse` called on untrusted input without a try/catch or validation?
- Are URL/path components constructed from user input without normalisation or sanitisation?
- Are RegExp patterns constructed from user strings (ReDoS risk)?
- Is there any dynamic code execution (`new Function`, dynamic import of user-controlled paths)?

#### Prototype Pollution

- Is `Object.assign`, spread (`{...obj}`), or recursive merge used on attacker-controlled objects?
- Are properties accessed via dynamic string keys from user input (e.g. `obj[userKey]`)?
- Are `__proto__`, `constructor`, or `prototype` keys specially handled or guarded against when merging or mapping objects?

```
✅ CHECKPOINT: Pass 1 — Input/Injection/Prototype complete
- Findings: N (X [VULN], Y [CONCERN])
- By severity: C CRITICAL, M MAJOR, Mi MINOR, N NIT
- Breaking escalations: [list or "none"]
- Proceeding to Pass 2
```

### Pass 2 — Information Leakage, Type Safety & Dependencies

**Goal:** Find data exposure, type-safety bypasses, and supply-chain risks.

#### Information Leakage

- Are stack traces or internal error details exposed in thrown errors or logs?
- Are secrets, tokens, or PII ever logged or stored?
- Do error messages accidentally reveal internal implementation details that aid attackers?

#### Type Safety at Runtime

- Are there cases where TypeScript types promise safety but runtime inputs bypass them (unchecked `any`, generic type erasure)?
- Are `unknown` inputs properly narrowed before use?
- Is there any `as unknown as T` or double-cast that bypasses runtime safety?
- Do non-null assertions (`!`) hide potential runtime null/undefined issues?

#### Dependency Risks

- Does the package declare any dependencies beyond `workspace:*`? If so, are they pinned and appropriate?
- Are any `devDependencies` accidentally imported in production code paths?
- **Dead-dep audit:** are all declared `workspace:*` entries actually imported somewhere in `src/`? (Quick check: `grep -r "@vielzeug/<dep>" packages/<name>/src/ --include="*.ts"`) Dead deps inflate the dependency graph and obscure the real attack surface — remove unused entries.

```
✅ CHECKPOINT: Pass 2 — Leakage/Types/Deps complete
- Findings: N (X [VULN], Y [CONCERN])
- By severity: C CRITICAL, M MAJOR, Mi MINOR, N NIT
- Breaking escalations: [list or "none"]
- Proceeding to Pass 3
```

### Pass 3 — Browser/Server Surfaces & Re-scan

**Goal:** Cover environment-specific risks and verify all [VULN] findings from Passes 1–2 are addressed.

#### Browser-specific Risks

- Is `localStorage`/`sessionStorage` access guarded against `SecurityError` and used for non-sensitive data only?
- Is `postMessage` used with proper origin checks and restricted message handling?
- Are DOM XSS vectors (`innerHTML`, `outerHTML`, `insertAdjacentHTML`) avoided or sanitised?
- Are event handlers designed to avoid accidentally executing untrusted data as code?

#### Server-side / API / Auth (usually N/A)

If this library interacts with HTTP APIs, authentication tokens, cookies, or CSRF-sensitive operations, check for: proper CSRF mitigation, no secrets in logs/errors/URLs, safe handling of auth decisions.

For pure client-side utility libraries, note explicitly: **N/A**.

#### Re-scan of [VULN] findings

For each `[VULN]` from Passes 1–2:

```
Has this finding been fixed?
├─ YES → annotate [DONE] in security.md
└─ NO → confirm it remains open in the summary
```

```
✅ CHECKPOINT: Pass 3 — Browser/Server/Re-scan complete
- New findings this pass: N (X [VULN], Y [CONCERN])
- Prior [VULN] items fixed: N
- Prior [VULN] items open: N
- All-pass totals: X [VULN], Y [CONCERN]
- Writing security.md summary…
```

## 5. Output format

List every finding with:

```
[STATUS] [SEVERITY] [CATEGORY]
File: src/foo.ts:42
Finding: <description>
Risk: <what an attacker could do>
Fix: <recommended remediation>
```

Where:

- **STATUS**: `[VULN]` = confirmed vulnerability, `[CONCERN]` = risky pattern, `[SAFE]` = explicitly checked safe area
- **SEVERITY**: `CRITICAL` | `MAJOR` | `MINOR` | `NIT` (same scale as `/pkg-review` — see `.ai/rules/agent-execution.md § Severity`)
- **CATEGORY**: `Input Validation`, `Injection`, `Prototype Pollution`, `Information Leakage`, `Type Safety`, `Dependency`, `Browser`, `Server/API`, or similar

When a finding is fixed during the audit, annotate it inline:

```
[VULN] [MAJOR] [Injection] File: src/foo.ts:42 [DONE]
Finding: ...
Fix: ...
```

## 6. Persist findings

Write the audit output to `.ai/workflows/runs/<name>/security.md`. Follow the persistence semantics in `.ai/rules/agent-execution.md § Run artifacts` — append each surface's findings under its own heading within a run; overwrite at the start of a new cycle. Present the same content in chat.

## 7. Audit summary

End with an **Audit Summary** section using **exactly this format**:

```
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

This is a single aggregate signal, deliberately worded differently from the per-finding `CRITICAL`/`MAJOR`/`MINOR`/`NIT` severity scale above (§0) so the two are never mistaken for the same thing — "Red" doesn't mean "has a `CRITICAL`", it means "ship-blocking as a whole."

**Rating rules:**

| Condition                                  | Rating    |
| ------------------------------------------ | --------- |
| Any unfixed CRITICAL                       | 🔴 Red    |
| Unfixed MAJOR, no CRITICAL                 | 🟡 Yellow |
| Only MINOR/NIT concerns, no CRITICAL/MAJOR | 🟢 Green  |
| No attack surface; no meaningful risks     | 🔵 N/A    |

## 8. Quick reference — execution flow

```
Read plan.md           → focus on changed areas first
    ↓
Pass 1: Input/Injection/Prototype  → Checkpoint
    ↓
Pass 2: Leakage/Types/Deps         → Checkpoint
    ↓
Pass 3: Browser/Server + re-scan   → Checkpoint
    ↓
Write security.md      → Structured Summary + Risk Rating
```
