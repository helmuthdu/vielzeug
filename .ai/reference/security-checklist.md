# Vielzeug Security Checklist

Concrete vulnerability classes to check during the `security` module of a `validate` task. These are Vielzeug's own TypeScript packages — client-side and universal libraries, mostly zero external runtime dependencies, so the attack surface is largely the package's own code and how callers use it. Assume **untrusted user input can reach any public API**.

Mindset: flag unsafe patterns even when not currently exploitable — future usage may create an exploit path. Default to flagging a risky pattern rather than calling it safe. Prefer secure-by-default designs over opt-in security. Any escape hatch (raw HTML, direct DOM access, `eval`-like behavior) must be justified, documented, and secured.

## Input & injection

- Are user-supplied strings ever passed to `eval`, `Function()`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or `document.write`?
- Is `JSON.parse` called on untrusted input without a try/catch or shape validation?
- Are URL/path components built from user input without normalization or sanitization?
- Are RegExp patterns constructed from user strings (ReDoS risk)?
- Any dynamic code execution (`new Function`, dynamic import of a user-controlled path)?

## Prototype pollution

- Is `Object.assign`, object spread, or a recursive merge applied to attacker-controlled objects?
- Are properties accessed via dynamic string keys from user input (`obj[userKey]`)?
- Are `__proto__`, `constructor`, and `prototype` keys specifically guarded against during merge/map operations?

## Information leakage

- Are stack traces or internal error details exposed in thrown errors or logs?
- Are secrets, tokens, or PII ever logged or stored?
- Do error messages reveal internal implementation details that help an attacker?

## Type safety at runtime

- Do TypeScript types promise safety that runtime inputs can bypass (unchecked `any`, generic type erasure)?
- Are `unknown` inputs narrowed before use?
- Any `as unknown as T` double-cast that bypasses runtime safety?
- Do non-null assertions (`!`) hide a real potential null/undefined path?

## Dependency risk

- Does the package declare dependencies beyond `workspace:*`? If so, are they pinned and justified?
- Are any `devDependencies` accidentally imported on a production code path?
- Dead-dep check: is every declared `workspace:*` entry actually imported somewhere in `src/`? Quick check: `grep -r "@vielzeug/<dep>" packages/<name>/src/ --include="*.ts"`. Unused entries inflate the dependency graph and obscure the real attack surface.

## Browser-specific

- Is `localStorage`/`sessionStorage` access guarded against `SecurityError`, and used only for non-sensitive data?
- Is `postMessage` used with explicit origin checks and restricted message handling?
- Are DOM XSS vectors (`innerHTML`, `outerHTML`, `insertAdjacentHTML`) avoided or sanitized?
- Do event handlers avoid a path where untrusted data could be executed as code?

## Server-side / API / auth

Usually not applicable for these packages. If a package talks to HTTP APIs, auth tokens, cookies, or CSRF-sensitive operations, check for: CSRF mitigation, no secrets in logs/errors/URLs, safe handling of auth decisions. For pure client-side utility packages, note explicitly: not applicable.

## Escalation

A finding that can only be fixed with a breaking API change should not be silently patched — surface the finding, the proposed fix, and affected call sites, then wait for a decision before changing the public surface.

