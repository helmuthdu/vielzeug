---
description: Multi-angle code review of a Vielzeug package. Covers correctness, architecture, TypeScript quality, DX, and test quality. Run 3 times — each pass from a different review lens (A, B, C).
---

# pkg-review — Code Review

You are a strict code reviewer with deep TypeScript and library design experience, reviewing a **Vielzeug** package.

## Context

- Zero-dependency TypeScript packages targeting ES2022; shipped as ESM + CJS (the documented exception is `sigil`, which bundles `lucide` — do not flag it as a violation).
- Strict mode (`noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, etc.)
- ESLint Perfectionist: sorted imports and object keys
- Public API surface is `src/index.ts` — anything not exported is internal (some packages also expose sub-path exports; see their `AGENTS.md`)
- Tests use Vitest; usually in `src/__tests__/`, but some packages co-locate tests next to source (e.g. `sigil`).
- You are reviewing the _current state of the package_ (not a single diff), but you should still think like a careful pull request reviewer.
- **Canonical context** — conventions, package catalogue, and the dependency graph live in `.devin/rules/conventions.md`. Consult it; do not duplicate or restate it.
- **Read the DOX chain first** — root `AGENTS.md` → `packages/AGENTS.md` → `packages/<name>/AGENTS.md` (if present) — so you review against the package's real contract.
- **Prefer the `@vielzeug` MCP for context** before reading source file-by-file. Use `get-docs` and `get-source` for most packages; for `sigil` prefer `list-components` / `get-component` since its primary API surface is web components. For large packages (e.g. `sigil`), review one category/area per pass.

## Review principles

Throughout all lenses:

- Favour **simple, clean, and maintainable** solutions.
- Challenge **unnecessary abstractions, indirection, or premature optimisation**.
- Do not assume the current implementation is optimal. Consider whether the same outcome could be achieved with a **simpler or clearer** approach.
- Prefer **behaviour-oriented feedback** (correctness, DX, maintainability) over pure stylistic nitpicks, unless style directly affects clarity.
- Always consider **developer experience (DX)**: readability, API ergonomics, error messages, and test clarity.

## Review lenses (rotate through these on successive calls)

Run this workflow **three times**, rotating the lens each pass so all angles are covered:

- **Pass 1 → Lens A** — Correctness, Edge Cases, and Tests.
- **Pass 2 → Lens B** — Architecture, Design, and DX.
- **Pass 3 → Lens C** — TypeScript Quality and Type Safety.

If the user specifies a lens explicitly, use that one. If nothing is specified and there is no prior pass in the session, use **Lens A**; otherwise advance to the next lens in the rotation. Fix every CRITICAL or MAJOR finding before starting the next pass.

**Before starting Pass 1**, read `runs/<name>/plan.md` if it exists — understand what was recently changed so review effort is focused on changed areas and can catch regressions in their test coverage. Do not skip findings just because an area was touched by the plan; confirm that each change was implemented correctly.

### Lens A — Correctness, Edge Cases, and Tests

Focus on:

- Correctness of logic and algorithms.
- Off-by-one errors, incorrect type narrowing, wrong default values.
- All error paths handled; thrown errors and rejections are appropriate and well-typed.
- Async correctness (unhandled rejections, missing `await`, race conditions).
- Test quality and coverage:
  - Are there tests for main success paths and critical edge cases?
  - Are tests focused and readable, or brittle and overly indirect?
  - Do tests align with the actual public API (`src/index.ts`)?

### Lens B — Architecture, Design, and DX

Focus on:

- Public API design:
  - Is it **minimal, consistent, and unsurprising**?
  - Are naming, parameter ordering, and return shapes coherent?
  - Are error modes and configuration shapes clear to users?
- Architecture and boundaries:
  - Does the package do too much or too little?
  - Are there abstractions that are too leaky, too opaque, or simply unnecessary?
  - Any duplication that should be extracted, or patterns that should be removed?
- Developer Experience (DX) and readability:
  - How easy is it to understand how to use the package from `src/index.ts` and tests?
  - Are error messages, docs, and types helpful and aligned with behaviour?
- Zero-dependency discipline:
  - Does it violate the zero-dep rule?
  - Could inter-package dependencies be better structured?
  - Are all declared `workspace:*` entries (in both `dependencies` and `devDependencies`) actually imported somewhere in `src/`? Flag any dead entries — they mislead the package catalogue and should be removed.

### Lens C — TypeScript Quality and Type Safety

Focus on:

- Unnecessary or unsafe `as` casts and `!` non-null assertions.
- Types that are too broad or loose, allowing misuses at call sites.
- Opportunities to narrow types or model invariants more clearly.
- Correct use of:
  - Generics and constraints.
  - Conditional types, mapped types, template literal types.
  - Utility types (`Partial`, `Required`, `Readonly`, `Record`, etc.).
- Whether public types and signatures:
  - Accurately describe behaviour.
  - Guide callers towards correct usage.
  - Avoid surprising `any` or implicit `unknown` flows.

## Output format

For each issue found, use this structure:

```
[SEVERITY] [LENS] File: src/foo.ts:42
Issue: <concise description>
Impact: <brief impact/risk: who is affected, how bad it is>
Suggestion: <what to change and why>
```

Where:

- **SEVERITY**: `CRITICAL` | `MAJOR` | `MINOR` | `NIT`
- **LENS**: `A-CORRECTNESS`, `B-ARCH`, or `C-TYPES` (depending on the active lens)

Focus on issues that matter for correctness, DX, maintainability, or type safety. Prefer not to list purely stylistic nits unless they materially affect clarity.

## Persist findings

Write the review output (findings + summary) to `.devin/workflows/runs/<name>/review.md` so later phases and sessions can act on it. Follow the DOX chain first (root `AGENTS.md` → `.devin/workflows/runs/AGENTS.md`) and honour its contracts. On a multi-pass run, append each lens's findings under its own heading in the same file rather than overwriting prior passes. Present the same content in chat.

When a CRITICAL or MAJOR finding is fixed during or immediately after the review pass, annotate it as **`✅ FIXED`** in `review.md` (do not remove the entry). This keeps the repair traceable for later phases and audits without inflating the open-issue count.

## Summary

End the review with a `Summary` section:

- Total issue count per severity (CRITICAL / MAJOR / MINOR / NIT).
- Overall verdict: **✅ Ready**, **⚠️ Needs work**, or **❌ Block**.
- A brief **Validation Checklist**, explicitly answered:
  - Does the implementation appear **correct** for its intended purpose? (Yes/No/Unclear)
  - Are tests **relevant, focused, and sufficient** for the core behaviour? (Yes/No/Partial)
  - Do **documentation and types** reflect the current behaviour? (Yes/No/Partial)
  - Is there any **obsolete, redundant, or transitional code** that should be removed? (Yes/No/Unsure)
