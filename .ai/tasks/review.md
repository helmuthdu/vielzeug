# Review Task

## Use when

Investigate, audit, redesign, plan, or review code without making changes unless explicitly requested.

## Inputs

- `scope`
- `goal`
- `mode`: `current` (default), `greenfield`, or `pr`
- `reviewPass`: `primary` (default) or `independent`; `independent` applies only to `pr`
- `intent`: PR description, change-file summary, or explicit goal
- `changedFiles`: branch diff or named files
- `comparison`: `diff` or named before/after implementation
- `checks`: `correctness`, `architecture`, `design`, `dx`, `maintainability`, `simplicity`, `readability`, `performance`, `regression`, `types`, `security`, `coverage`, `testQuality`
- `depth`: `quick` or `full`

### Valid combinations

| Mode | Required | Optional | Invalid |
| --- | --- | --- | --- |
| `current` | `scope`, `goal` | `checks`, `depth` | `reviewPass`, `intent`, `changedFiles`, `comparison` |
| `greenfield` | `scope`, `goal` | `checks`, `depth` | `reviewPass`, `intent`, `changedFiles`, `comparison` |
| `pr` primary | `scope`, `intent`, `changedFiles` | `goal`, `checks`, `depth` | `comparison` |
| `pr` independent | `scope`, `intent`, `changedFiles`, `comparison` | `goal`, `checks`, `depth` | — |

### Default checks

- `current`: `correctness`, `design`, `maintainability`, `types`, `coverage`.
- `greenfield`: `architecture`, `design`, `dx`, `maintainability`, `simplicity`.
- `pr`: `correctness`, `readability`, `maintainability`, `regression`, `types`, `coverage`.
- Add `security` when security-sensitive code is in scope.
- Add `performance` only for hot paths, measurable regressions, or explicit performance goals.

`quick` may combine selected checks, but never skips mode-required evidence: full changed-file reads and call-site checks for `pr`; prior/new comparison for an independent pass; impact inventory for a breaking greenfield recommendation.

## Load

- `.ai/core/policy.md`
- `.ai/core/workspace.md`
- `.ai/core/conventions.md` when package source is in scope
- `.ai/reference/security-checklist.md` for security review
- relevant `AGENTS.md` chain

## Preconditions

Confirm valid inputs and selected defaults. Use `[BLOCKED]` when requirements permit materially different designs or the review requires destructive/runtime-only evidence.

State assumptions before analysis when required files, runtime behavior, consumer constraints, or external usage cannot be verified. Mark each assumption `[VERIFY]`; do not treat it as design evidence.

## Common flow

1. Read relevant contracts, source, tests, docs, and metadata.
2. Apply selected checks at requested depth. Under full depth, review public API, stateful, or cross-package work in two source-first passes: contract (API, types, errors, lifecycle, exports, docs, dependents), then implementation (correctness, boundaries, cleanup, tests, races, security).
3. Apply the selected mode flow.
4. Verify every claim against source or mark it `[VERIFY]`.
5. Rank findings by expected user/developer impact relative to implementation, migration, and validation cost; use dependency order to break ties.

## Current mode

- Evaluate selected checks within approved compatibility constraints.
- Recommend source-backed improvements only.
- Inspect changed and adjacent coordination hotspots for mixed responsibilities; report `[DECOMPOSE]` when cohesive extraction reduces future change coupling.

## Greenfield mode

- Treat current architecture as evidence of behavior, not proof of optimal design.
- Challenge boundaries and abstractions but preserve source-backed mechanisms whose benefits exceed their complexity.
- Before recommending removal, replacement, or incompatible redesign, enumerate source references, public exports, dependent packages, tests, and documentation surfaces; state unknown external usage separately.
- Recommend deletion explicitly when an abstraction, layer, or extension point has no source-backed benefit proportional to its cost.
- Apply policy decision-ownership rules before delegating recommendation workstreams.

## PR mode

1. Read every changed file in full, then surrounding source needed to establish its contracts; do not review diff hunks in isolation.
2. Compare changed behavior against stated intent.
3. Search real call sites for every changed public API, contract, or behavior.
4. Review change files, docs, types, exports, tests, and generated artifacts when the changed surface requires them.
5. Run narrow relevant validation when execution access exists; report each command and result. Otherwise mark unavailable execution `[VERIFY]`.

### Independent pass

- Read new and prior implementations in full, or the complete diff plus affected surrounding source.
- Evaluate fitness for stated intent against prior behavior.
- Treat prior review findings and implementation claims as unverified until confirmed from source or validation.
- Actively seek counterexamples, failure modes, changed-call-site regressions, and simpler alternatives.
- State tradeoffs in complexity, flexibility, performance, coupling, testability, and DX.

## Checks

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

For security reviews, finish only after every raised finding is `[FIXED]`, `[DEFERRED]`, or explicitly open.

## Severity

Use this scale for every finding:

- `High`: merge-blocking correctness, security, data-loss, public-contract, or broad regression risk.
- `Medium`: real behavior, maintainability, test, or DX defect with bounded impact.
- `Low`: source-backed improvement with limited risk; never style preference alone.

Do not report style-only nits unless they impair readability, maintainability, or correctness.

## Common output

`[FINDING] <High|Medium|Low> — <file:line> — <problem> — <evidence> — <recommended fix>`

`[DECOMPOSE] <file> — <evidence> — <suggested module boundaries>`

`[IMPACT] <proposal> — <references/packages/surfaces checked> — <known and unknown consumers>`

Also report `[DEFERRED]`, `[VERIFY]`, and `[BLOCKED]` as needed. Persist a report under `.ai/state/<scope>/` only when another session must resume it.

## Greenfield output

Report 4–6 highest-value recommendations unless fewer source-backed issues exist. For each recommendation, use:

1. **Problem** — source-backed deficiency.
2. **Actionable change** — concrete refactor, removal, boundary, API, tooling, or workflow change.
3. **Why better** — affected checks and specific improvement.
4. **Impact** — references, dependents, migration surfaces, and unknown external usage.
5. **Effort** — Low, Medium, or High, driven by implementation, migration, and validation scope.
6. **Example** — only when a short diagram or signature removes ambiguity.

Finish with `## Top Priority Changes`, ranked by value-to-effort, long-term value, and dependency order.

Add `## Future Improvements` only when source-backed deferred work exists. Mark each item `[DEFERRED]` with its reason.

## PR output

Explicitly report:

- Intent: met, not met, or `[VERIFY]`.
- Validation: commands run and results, or why execution was unavailable.
- Tests: adequate, or gaps with affected behavior.
- Contracts: types, docs, exports, and change files aligned, or gaps.
- Cleanup: dead, transitional, or redundant code removed, or findings.

## Independent PR output

Start with `## Executive Summary`: 2–3 sentences covering better, worse, or mixed fitness for intent; main tradeoff; and final decision.

Then report:

- Tradeoffs: complexity, flexibility, performance, coupling, testability, and DX.
- Risks: overlooked edge cases or source-backed consumer regressions.
- Abstraction: justified, or a simpler alternative sufficient.
- Complexity: increased only where benefit is source-backed.
- Decision: `Approve`, `Approve with nits`, `Request changes`, or `Reject`; state minimum changes required. This is review output, not approval to merge, push, or release.
