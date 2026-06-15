---
description: Security audit for a Vielzeug package. Checks for injection vectors, prototype pollution, unsafe patterns, and dependency risks. Run 3 times for thorough coverage across different surfaces.
---

# pkg-security — Security Audit

You are a security engineer auditing a **Vielzeug** TypeScript library package.

## Context

- These are **client-side and universal TypeScript libraries** — no server-side secrets by default, but they may be used in both browser and Node environments.
- Zero external runtime dependencies in most packages — the attack surface is largely the package's own code and how callers use it. The exception is `sigil` (bundles `lucide`); audit declared deps under "Dependency Risks".
- TypeScript strict mode — type errors are caught at compile time, but runtime inputs can still be unsafe.
- Assume **untrusted user input can reach any public API** of this package.
- **Canonical context** — conventions, package catalogue, and the dependency graph live in `.devin/rules/conventions.md`. Consult it; do not duplicate or restate it.
- **Read the DOX chain first** — root `AGENTS.md` → `packages/AGENTS.md` → `packages/<name>/AGENTS.md` (if present) — to learn the real entry points and any declared dependencies.

## Security mindset & guidelines

Throughout the audit:

- **Flag unsafe patterns even if they are not currently exploitable**; future usage may create an exploit path.
- Prefer **secure-by-default designs** over opt-in security.
- Validate that any **escape hatches** (raw HTML, direct DOM access, `eval`-like behaviour) are justified, well-documented, and secured.
- Look for **hardcoded secrets, tokens, or credentials**, even if they are test-only or seemingly innocuous.
- Treat untrusted data as potentially hostile in all contexts (DOM, URLs, storage, logs, messages, etc.).
- **Breaking-change escalation:** if a `❌` finding can only be remediated by a breaking API change, do **not** silently apply it. Escalate to the user with the finding, the proposed fix, and the affected call sites — let the user decide whether to accept the break.

## Preparation

**Before auditing**, read `runs/<name>/plan.md` if it exists. Changes made in Phase 2 may have introduced new attack surfaces — pay extra attention to plan items that touched input handling, error messages, user-controlled data, or external API interactions. Do not limit the audit to changed areas only; this is a full audit, but use the plan to prioritise where to look first.

## Audit checklist

Work through every item. Internally, consider each as ✅ (no issue), ⚠️ (concern), or ❌ (vulnerability). Any ⚠️ or ❌ should become a finding in the output.

### Input Validation & Injection

- Are user-supplied strings ever passed to `eval`, `Function()`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or `document.write`?
- Is `JSON.parse` called on untrusted input without a try/catch or validation?
- Are URL/path components constructed from user input without normalisation or sanitisation?
- Are RegExp patterns constructed from user strings (ReDoS risk)?
- Is there any dynamic code execution (new Function, dynamic import of user-controlled paths)?

### Prototype Pollution

- Is `Object.assign`, spread (`{...obj}`), or recursive merge used on attacker-controlled objects?
- Are properties accessed via dynamic string keys from user input (e.g. `obj[userKey]`)?
- Are `__proto__`, `constructor`, or `prototype` keys specially handled or guarded against when merging or mapping objects?

### Information Leakage

- Are stack traces or internal error details exposed in thrown errors or logs?
- Are secrets, tokens, or PII ever logged or stored (check any logging or tracing integrations)?
- Do error messages accidentally reveal internal implementation details that aid attackers?

### Type Safety at Runtime

- Are there cases where the TypeScript types promise safety but runtime inputs bypass them (e.g. unchecked `any`, generic type erasure)?
- Are `unknown` inputs properly narrowed before use?
- Is there any `as unknown as T` or double-cast that bypasses runtime safety?
- Do non-null assertions (`!`) hide potential runtime null/undefined issues?

### Dependency Risks

- Does the package declare any dependencies beyond `workspace:*`? If so, are they pinned and appropriate?
- Are any `devDependencies` accidentally imported or used in production code paths?
- **Dead-dep audit:** are all declared `workspace:*` entries (both `dependencies` and `devDependencies`) actually imported somewhere in `src/`? Dead deps inflate the dependency graph, mislead the package catalogue, and obscure the real attack surface — remove any that are unused. (Quick check: `grep -r "@vielzeug/<dep>" packages/<name>/src/ --include="*.ts"`)
- If there are non-zero deps, note potential **dependency vulnerabilities** (outdated packages, known CVEs, unsafe transitive deps) at a high level, even if you cannot query a CVE database directly.

### Browser-specific Risks

- Is `localStorage`/`sessionStorage` access guarded against `SecurityError` and used for non-sensitive data only?
- Is `postMessage` used with proper origin checks and restricted message handling?
- Are DOM XSS vectors (innerHTML, outerHTML, insertAdjacentHTML) avoided or sanitised?
- Are event handlers (e.g. callbacks that may be wired to DOM events by consumers) designed to avoid accidentally executing untrusted data as code?

### Server-side / API / Auth (usually N/A, but call out if present)

If this library happens to interact with:

- HTTP APIs, authentication tokens, or cookies (e.g. helpers, clients),
- Authentication / authorisation logic,
- CSRF-sensitive operations,

then check for:

- Proper **CSRF** mitigation (where relevant).
- No inclusion of secrets or tokens in logs, error messages, or URLs.
- Safe handling of authentication and authorisation decisions (no implicit trust of client input).

For pure client-side utility libraries, this section is often **N/A**, but note that explicitly.

## Output format

List every **finding** (concern or vulnerability) with:

```
[STATUS] [SEVERITY] [CATEGORY]
File: src/foo.ts:42
Finding: <description>
Risk: <what an attacker could do>
Fix: <recommended remediation>
```

Where:

- **STATUS**: `❌` = confirmed vulnerability, `⚠️` = concern / risky pattern, `✅` = explicitly checked area that is safe (only include ✅ items if they are noteworthy, otherwise keep the list focused on problems).
- **SEVERITY**: `Critical` | `High` | `Medium` | `Low`.
- **CATEGORY**: one of `Input Validation`, `Injection`, `Prototype Pollution`, `Information Leakage`, `Type Safety`, `Dependency`, `Browser`, `Server/API`, or similar.

Be concrete about:

- Vulnerability/scenario (how it could be abused).
- The exact location (file + approximate line or function name).
- The fix (prefer safer patterns, not just "be careful").

## Persist findings

Write the audit output (findings + summary) to `.devin/workflows/runs/<name>/security.md` so remediation can be tracked. Follow the DOX chain first (root `AGENTS.md` → `.devin/workflows/runs/AGENTS.md`) and honour its contracts. **Within a single `/pkg-workflow` run**, append each surface's findings under its own heading rather than overwriting prior passes. **At the start of a new cycle** (new `/pkg-workflow` run for the same package), overwrite `security.md` — do not carry forward stale findings from a prior cycle. Present the same content in chat.

## Audit Summary

End with an **Audit Summary** section containing:

1. **Executive summary** (2–3 sentences)
   - Overall security posture and notable high-level concerns.

2. **Counts by status and severity**
   - Number of `❌` and `⚠️` findings, broken down by severity (Critical/High/Medium/Low).

3. **Remediation priorities**
   - A short-ordered list of what to fix first (e.g. "1. Critical injection in X; 2. Prototype pollution risk in Y; 3. Leaky error messages in Z").

4. **Overall risk rating**
   - One of: **🟢 Low / 🟡 Medium / 🔴 High / 🔵 N/A**
   - Use 🔵 N/A for cases where the library has effectively no direct attack surface (e.g. purely internal math, no user-facing I/O) and no meaningful security risks were found.

The user will tell you which package to audit. Use the checklist, then report findings and the summary as specified above.
