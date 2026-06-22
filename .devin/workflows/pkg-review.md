---
description: Multi-angle code review of a Vielzeug package. Covers correctness, architecture, TypeScript quality, DX, and test quality. Run 3 times — each pass from a different review lens (A, B, C).
---

# pkg-review — Code Review

You are a strict code reviewer with deep TypeScript and library design experience, reviewing a **Vielzeug** package.

## 0. Agent Execution Model

**This workflow is designed for autonomous agent execution across three sequential lens passes.** Follow these principles:

### Execution Checkpoints

After each lens pass, **output a checkpoint summary** before proceeding:

```
✅ CHECKPOINT: Lens X complete
- Findings: N (C CRITICAL, M MAJOR, Mi MINOR, N NIT)
- CRITICAL fixed this pass: [list or "none"]
- MAJOR fixed this pass: [list or "none"]
- Fix gate: CLEAR / ❌ BLOCKED (N unfixed CRITICAL/MAJOR remain)
- Proceeding to Lens Y / Writing review.md
```

### Decision Framework

When facing ambiguity, apply this priority order:

1. **Severity drives urgency** — CRITICAL and MAJOR findings must be fixed before the next lens begins. MINOR and NIT can be deferred to the summary.
2. **Behaviour beats comments** — if source code and a comment/doc disagree, the code is the ground truth for bugs; the comment is the ground truth for intent (flag the mismatch).
3. **Impact over style** — prefer behaviour-oriented findings (correctness, DX, safety) over purely aesthetic ones.
4. **Read plan.md before Pass 1** — focus extra attention on recently changed areas without skipping unchanged ones.
5. **When uncertain, read more** — use MCP tools or read source files before flagging a false positive.

### Anti-Patterns to Avoid

- ❌ **Do not** skip the lens rotation — each lens covers a distinct angle; merging them misses systematic gaps.
- ❌ **Do not** proceed to the next lens with unfixed CRITICAL or MAJOR findings.
- ❌ **Do not** flag purely stylistic nits as MAJOR — escalate severity only when clarity or correctness is materially affected.
- ❌ **Do not** start Pass 1 without reading `runs/<name>/plan.md` — you may miss coverage gaps in recently changed code.
- ❌ **Do not** remove fixed findings from `review.md` — annotate them `✅ FIXED` and keep them for traceability.
- ❌ **Do not** invent issues not grounded in actual source code.

### Structured Output Markers

Use consistent markers throughout your review output:

- `[CRITICAL]` — must fix; correctness or safety at risk
- `[MAJOR]` — should fix; significant DX, design, or type-safety issue
- `[MINOR]` — worth fixing; low-risk improvement
- `[NIT]` — optional polish
- `[FIXED]` — issue found and resolved within this pass
- `[BLOCKED]` — cannot resolve without user input; present recommendation
- `[VERIFY]` — requires runtime or external confirmation

## 1. Context

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

## 2. Review lenses (rotate through these on successive calls)

Run this workflow **three times**, rotating the lens each pass so all angles are covered:

- **Pass 1 → Lens A** — Correctness, Edge Cases, and Tests.
- **Pass 2 → Lens B** — Architecture, Design, and DX.
- **Pass 3 → Lens C** — TypeScript Quality and Type Safety.

If the user specifies a lens explicitly, use that one. If nothing is specified and there is no prior pass in the session, use **Lens A**; otherwise advance to the next lens in the rotation.

**Before starting Pass 1:**

1. Read `runs/<name>/plan.md` if it exists — focus extra attention on recently changed areas and verify each plan item was implemented correctly.
2. Prefer `mcp0_get-source` (`packageSlug: "<name>"`) to gather source context before reading files one-by-one.
3. Read the DOX chain: root `AGENTS.md` → `packages/AGENTS.md` → `packages/<name>/AGENTS.md`.

### Lens A — Correctness, Edge Cases, and Tests

**Goal:** Find bugs, missing error handling, and test coverage gaps. Do not evaluate design or types yet.

Focus on:

- Correctness of logic and algorithms.
- Off-by-one errors, incorrect type narrowing, wrong default values.
- All error paths handled; thrown errors and rejections are appropriate and well-typed.
- Async correctness (unhandled rejections, missing `await`, race conditions).
- Test quality and coverage:
  - Are there tests for main success paths and critical edge cases?
  - Are tests focused and readable, or brittle and overly indirect?
  - Do tests align with the actual public API (`src/index.ts`)?

**Fix gate — apply before Lens B:**

```
Are there any unfixed CRITICAL or MAJOR findings from Lens A?
├─ YES → Fix all before proceeding. Mark each ✅ FIXED in review.md.
└─ NO → Proceed to Lens B.
```

**Checkpoint:**

```
✅ CHECKPOINT: Lens A complete
- Findings: N (C CRITICAL, M MAJOR, Mi MINOR, N NIT)
- Fixed this pass: [list or "none"]
- Fix gate: CLEAR / ❌ BLOCKED
- Proceeding to Lens B
```

### Lens B — Architecture, Design, and DX

**Goal:** Evaluate API shape, internal architecture, and developer experience. Assume correctness was handled in Lens A.

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

**Fix gate — apply before Lens C:**

```
Are there any unfixed CRITICAL or MAJOR findings from Lens B?
├─ YES → Fix all before proceeding. Mark each ✅ FIXED in review.md.
└─ NO → Proceed to Lens C.
```

**Checkpoint:**

```
✅ CHECKPOINT: Lens B complete
- Findings: N (C CRITICAL, M MAJOR, Mi MINOR, N NIT)
- Fixed this pass: [list or "none"]
- Fix gate: CLEAR / ❌ BLOCKED
- Proceeding to Lens C
```

### Lens C — TypeScript Quality and Type Safety

**Goal:** Evaluate type-level safety, precision, and ergonomics. Assume correctness and design were handled in Lenses A and B.

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

**Checkpoint:**

```
✅ CHECKPOINT: Lens C complete
- Findings: N (C CRITICAL, M MAJOR, Mi MINOR, N NIT)
- Fixed this pass: [list or "none"]
- All-lens totals: C CRITICAL, M MAJOR, Mi MINOR, N NIT
- Writing review.md summary…
```

## 3. Output format

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

When a CRITICAL or MAJOR finding is fixed during or immediately after the review pass, annotate it inline:

```
[MAJOR] [B-ARCH] File: src/foo.ts:42 ✅ FIXED
Issue: ...
Suggestion: ...
```

## 4. Persist findings

Write the review output (findings + summary) to `.devin/workflows/runs/<name>/review.md` so later phases and sessions can act on it. Follow the DOX chain first (root `AGENTS.md` → `.devin/workflows/runs/AGENTS.md`) and honour its contracts. On a multi-pass run, append each lens's findings under its own heading in the same file rather than overwriting prior passes. Present the same content in chat.

## 5. Summary

End the review with a structured `Summary` section using **exactly this format**:

```
## Summary

### Finding Counts

| Lens | CRITICAL | MAJOR | MINOR | NIT | Fixed |
|------|----------|-------|-------|-----|-------|
| A — Correctness | N | N | N | N | N |
| B — Architecture | N | N | N | N | N |
| C — TypeScript | N | N | N | N | N |
| **Total** | **N** | **N** | **N** | **N** | **N** |

### Verdict

<✅ Ready | ⚠️ Needs work | ❌ Block>

<One sentence justifying the verdict.>

### Validation Checklist

- [ ] Implementation is correct for its intended purpose: Yes / No / Unclear
- [ ] Tests are relevant, focused, and sufficient for core behaviour: Yes / No / Partial
- [ ] Documentation and types reflect current behaviour: Yes / No / Partial
- [ ] No obsolete, redundant, or transitional code remains: Yes / No / Unsure

### Open Items

<List any unfixed MAJOR/CRITICAL that remain + recommended next step, or "None — all findings resolved.">
```

**Verdict rules:**

| Condition                       | Verdict       |
| ------------------------------- | ------------- |
| 0 unfixed CRITICAL or MAJOR     | ✅ Ready      |
| 1–2 unfixed MAJOR (no CRITICAL) | ⚠️ Needs work |
| Any unfixed CRITICAL            | ❌ Block      |

## 6. Quick Reference — Execution Flow

```
Before Pass 1: Read plan.md + MCP source
    ↓
Lens A: Correctness     → fix gate (CRITICAL/MAJOR) → Checkpoint
    ↓
Lens B: Architecture    → fix gate (CRITICAL/MAJOR) → Checkpoint
    ↓
Lens C: TypeScript      → Checkpoint
    ↓
Write review.md         → Structured Summary + Verdict
```
