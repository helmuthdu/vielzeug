---
description: Investigate, audit, redesign, plan, or review code.
---

# Review Task

## Use when

Investigate, audit, redesign, plan, or review code without making changes unless explicitly requested.

## Load

- root `AGENTS.md` (policy, safety, markers)
- `.ai/core/conventions.md` when package source is in scope
- `.ai/reference/security-checklist.md` for security review
- relevant subtree `AGENTS.md`

## Preconditions

Use `[BLOCKED]` when requirements permit materially different designs or the review requires destructive or runtime-only evidence.

State assumptions before analysis when required files, runtime behavior, consumer constraints, or external usage cannot be verified. Mark each `[VERIFY]`; do not treat it as design evidence.

## Flow

1. Read relevant contracts, source, tests, docs, and metadata.
2. Pick the mode below that matches the request and apply its checks. For public API, stateful, or cross-package work, review in two source-first passes: contract (API, types, errors, lifecycle, exports, docs, dependents), then implementation (correctness, boundaries, cleanup, tests, races, security).
3. Verify every claim against source or mark it `[VERIFY]`.
4. Rank findings by expected user/developer impact relative to implementation, migration, and validation cost; use dependency order to break ties.

Add `security` whenever security-sensitive code is in scope. Add `performance` only for hot paths, measurable regressions, or explicit performance goals.

## Modes

### Current

Default checks: correctness, design, maintainability, types, coverage.

- Evaluate within approved compatibility constraints.
- Recommend source-backed improvements only.
- Inspect changed and adjacent coordination hotspots for mixed responsibilities.

### Greenfield

Default checks: architecture, design, dx, maintainability, simplicity.

- Treat current architecture as evidence of behavior, not proof of optimal design.
- Challenge boundaries and abstractions but preserve source-backed mechanisms whose benefits exceed their complexity.
- Before recommending removal, replacement, or incompatible redesign, enumerate source references, public exports, dependent packages, tests, and documentation surfaces; state unknown external usage separately.
- Recommend deletion explicitly when an abstraction, layer, or extension point has no source-backed benefit proportional to its cost.

### PR

Default checks: correctness, readability, maintainability, regression, types, coverage.

1. Read every changed file in full, then surrounding source needed to establish its contracts; do not review diff hunks in isolation.
2. Compare changed behavior against stated intent.
3. Search real call sites for every changed public API, contract, or behavior.
4. Review change files, docs, types, exports, tests, and generated artifacts when the changed surface requires them.
5. Run narrow relevant validation when execution access exists; report each command and result. Otherwise mark unavailable execution `[VERIFY]`.

For an independent pass (reviewing a PR fresh, not building on a prior review), read both new and prior implementations in full. Actively seek counterexamples, failure modes, changed-call-site regressions, and simpler alternatives. State tradeoffs in complexity, flexibility, performance, coupling, testability, and DX.

## Check glossary

- `correctness`: logic, boundaries, async behavior, errors, cleanup, regression tests.
- `architecture`: boundaries, layering, dependency direction, data flow, control flow, framework coupling.
- `design`: API clarity, naming, consistency, inputs, outputs, error contracts, discoverability.
- `dx`: discoverability, common-case ergonomics, onboarding, local setup, debugging, tooling friction, testability, extension points, error usability.
- `maintainability`: cohesion, file responsibility, dependency direction, repeated coordination hotspots, extraction boundaries.
- `simplicity`: nesting, implicit or magic behavior, duplication, incidental complexity, speculative configuration, redundant layers, abstraction payoff, local reasoning.
- `readability`: control-flow clarity, naming, structure, and comments that explain non-obvious rationale.
- `performance`: obvious or measurable inefficiencies, allocation, I/O, repeated work, hot-path behavior; do not report speculative micro-optimizations.
- `regression`: intent alignment, changed-contract call sites, compatibility impact, prior behavior no longer covered.
- `types`: unsafe assertions, broad types, narrowing, generic invariants.
- `security`: checklist-driven injection, prototype, data exposure, runtime validation, browser/server risks.
- `coverage`: public happy paths, failures, boundaries, races, guards, lifecycle behavior.
- `testQuality`: discovery, behavior-vs-implementation assertions, duplication, determinism, mock/setup complexity.

For security reviews, finish only after every raised finding is fixed, `[DEFERRED]`, or explicitly open. When a finding is fixed in the same pass, annotate it inline rather than deleting the evidence.

## Cross-cutting completeness inventory

Use an evidence inventory only for removals, migrations, workspace-wide renames, package deprecations, or similarly cross-cutting work where missed leftovers are a material risk. Do not require it for routine edits.

1. Name the evidence classes that can retain the old behavior: dependencies and lockfiles, imports and exports, runtime/configuration names, generated artifacts, tests and fixtures, demos, documentation, and CI/release surfaces as applicable.
2. Track each relevant item as `active`, `removed`, `replaced`, `retained`, or `unknown`. Every retained item needs a reason; every unknown remains `[VERIFY]` or `[BLOCKED]`.
3. Re-run source searches and relevant validation after the change. Report commands actually executed separately from commands merely recommended.
4. Keep the inventory in the task report or working plan by default. Create a durable artifact only when the user requests one or future verification genuinely depends on it.
5. Do not claim completion without listing the evidence classes checked and unresolved exceptions.

## Severity

- `High`: merge-blocking correctness, security, data-loss, public-contract, or broad regression risk.
- `Medium`: real behavior, maintainability, test, or DX defect with bounded impact.
- `Low`: source-backed improvement with limited risk; never style preference alone.

Do not report style-only nits unless they impair readability, maintainability, or correctness.

## Output

Each finding names its severity, location, problem, evidence, and recommended fix. Each proposal names the references, packages, and surfaces checked, and known versus unknown consumers. Report `[DEFERRED]`, `[VERIFY]`, and `[BLOCKED]` as needed.

### Greenfield output

Report the 4–6 highest-value recommendations unless fewer source-backed issues exist. For each: **Problem**, **Actionable change**, **Why better** (affected checks), **Impact** (references, dependents, migration surfaces, unknown external usage), **Effort** (Low/Medium/High), and an **Example** only when a short diagram or signature removes ambiguity.

Finish with `## Top Priority Changes`, ranked by value-to-effort, long-term value, and dependency order. Add `## Future Improvements` only when source-backed deferred work exists, each item `[DEFERRED]` with its reason.

### PR output

Explicitly report:

- Intent: met, not met, or `[VERIFY]`.
- Validation: commands run and results, or why execution was unavailable.
- Tests: adequate, or gaps with affected behavior.
- Contracts: types, docs, exports, and change files aligned, or gaps.
- Cleanup: dead, transitional, or redundant code removed, or findings.

For an independent PR pass, start with `## Executive Summary`: 2–3 sentences covering fitness for intent, the main tradeoff, and the decision (`Approve`, `Approve with nits`, `Request changes`, or `Reject`). Then report tradeoffs, risks, abstraction justification, and complexity. This is review output, not approval to merge, push, or release.
