# pkg-review — Code Review

> **Canonical source:** This file is the single source of truth for all AI tools. Generated, gitignored stubs in `.claude/commands/` and `.devin/workflows/` delegate here (see `.ai/workflows/manifest.json` + `pnpm gen:workflow-docs`); `.junie/guidelines.md` links here directly with no stub file.

You are a strict code reviewer with deep TypeScript and library design experience, reviewing a **Vielzeug** package.

## 0. Agent execution model

Follow `.ai/rules/process/agent-execution.md` — universal principles, decision framework, markers, and convergence rules.

### Workflow-specific markers

Severity scale (`CRITICAL`/`MAJOR`/`MINOR`/`NIT`) is shared with `/pkg-security` — see `.ai/rules/process/agent-execution.md § Severity`.

| Marker       | Meaning                                                   |
| ------------ | --------------------------------------------------------- |
| `[CRITICAL]` | Must fix — correctness or safety at risk                  |
| `[MAJOR]`    | Should fix — significant DX, design, or type-safety issue |
| `[MINOR]`    | Worth fixing — low-risk improvement                       |
| `[NIT]`      | Optional polish                                           |
| `[FIXED]`    | Issue found and resolved within this pass                 |

### Execution checkpoints

After each lens pass, output a checkpoint before proceeding:

```text
✅ CHECKPOINT: Lens X complete
- Findings: N (C CRITICAL, M MAJOR, Mi MINOR, N NIT)
- CRITICAL fixed this pass: [list or "none"]
- MAJOR fixed this pass: [list or "none"]
- Fix gate: CLEAR / ❌ BLOCKED (N unfixed CRITICAL/MAJOR remain)
- Proceeding to Lens Y / Writing review.md
```

## 1. Context

See `.ai/rules/process/agent-execution.md § Context pointers` and `§ DOX chain`.

Prefer the `@vielzeug` MCP's source-lookup tool (`packageSlug: "<name>"`) to gather source context before reading files one-by-one — resolve the exact tool name from your client's MCP tool list, don't assume a fixed prefix. For `refine`, prefer its component-listing tools since its primary API surface is web components. For large packages, review one category/area per pass.

**Before Pass 1:** read `runs/<name>/plan.md` if it exists — focus extra attention on the files/symbols its items reference and verify each plan item was implemented correctly. Do not use `git diff`/`git log` to find "what changed" — `plan.md` already enumerates it, and this is otherwise a full read of the current source, not a diff review.

## 2. Review principles

Throughout all lenses:

- Favour **simple, clean, and maintainable** solutions.
- Challenge **unnecessary abstractions, indirection, or premature optimisation**.
- Do not assume the current implementation is optimal.
- Prefer **behaviour-oriented feedback** (correctness, DX, maintainability) over style nitpicks unless style directly affects clarity.
- Always consider **developer experience**: readability, API ergonomics, error messages, and test clarity.

## 3. Review lenses

Run this workflow **three times**, rotating the lens each pass:

- **Pass 1 → Lens A** — Correctness, Edge Cases, and Tests.
- **Pass 2 → Lens B** — Architecture, Design, and DX.
- **Pass 3 → Lens C** — TypeScript Quality and Type Safety.

If the user specifies a lens explicitly, use that one. If nothing is specified and there is no prior pass in the session, use **Lens A**; otherwise advance to the next lens in the rotation.

### Lens A — Correctness, Edge Cases, and Tests

**Goal:** Find bugs, missing error handling, and test coverage gaps.

Focus on:

- Correctness of logic and algorithms; off-by-one errors, incorrect type narrowing, wrong default values.
- All error paths handled; thrown errors and rejections are appropriate and well-typed.
- Async correctness (unhandled rejections, missing `await`, race conditions).
- Test quality and coverage: main success paths, critical edge cases, focused and readable tests, alignment with public API.

**Fix gate — apply before Lens B:**

- Fix all CRITICAL and MAJOR findings that do not require a breaking API change.
- For findings requiring `[ESCALATE]`: record in `review.md` and continue to Lens B — do not deadlock on a single escalated item.
- If any non-escalated CRITICAL or MAJOR findings remain unfixed, do NOT proceed.

### Lens B — Architecture, Design, and DX

**Goal:** Evaluate API shape, internal architecture, and developer experience.

Focus on:

- Public API design: minimal, consistent, unsurprising; coherent naming, parameter ordering, return shapes; clear error modes.
- Architecture and boundaries: does the package do too much or too little? Leaky or unnecessary abstractions? Duplication to extract or patterns to remove?
- DX and readability: how easy is it to understand how to use the package from `src/index.ts` and tests?
- Zero-dependency discipline: no dep-rule violations; no dead `workspace:*` entries in `dependencies` or `devDependencies`.

**Fix gate — apply before Lens C:**

- Fix all CRITICAL and MAJOR findings that do not require a breaking API change.
- For findings requiring `[ESCALATE]`: record in `review.md` and continue to Lens C.
- If any non-escalated CRITICAL or MAJOR findings remain unfixed, do NOT proceed.

### Lens C — TypeScript Quality and Type Safety

**Goal:** Evaluate type-level safety, precision, and ergonomics.

Focus on:

- Unnecessary or unsafe `as` casts and `!` non-null assertions.
- Types that are too broad or loose, allowing misuses at call sites.
- Opportunities to narrow types or model invariants more clearly.
- Correct use of generics, conditional types, mapped types, template literal types, utility types.
- Whether public types and signatures accurately describe behaviour and guide callers toward correct usage.

## 4. Output format

See `.ai/rules/docs/review-template.md` for the per-finding format and inline `[FIXED]` annotation.

## 5. Persist findings

Write the review output to `.ai/workflows/runs/<name>/review.md` once, after all 3 lenses complete — one section per lens in the final file, not a running append after each pass. Overwrite any prior contents (see `.ai/rules/process/agent-execution.md § Run artifacts`). Present the same content in chat.

## 6. Summary

See `.ai/rules/docs/review-template.md` for the exact `review.md` Summary format, Verdict rules, and Validation Checklist.

## 7. Quick reference — execution flow

```text
Before Pass 1: Read plan.md + MCP source
    ↓
Lens A: Correctness  → fix gate (CRITICAL/MAJOR, skip [ESCALATE]) → Checkpoint
    ↓
Lens B: Architecture → fix gate (CRITICAL/MAJOR, skip [ESCALATE]) → Checkpoint
    ↓
Lens C: TypeScript   → Checkpoint
    ↓
Write review.md      → Structured Summary + Verdict
```
