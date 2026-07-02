# Vielzeug — Agent Execution

Universal principles, markers, and contracts for all Vielzeug AI workflows. Each workflow in `.ai/workflows/` references this file rather than duplicating these rules.

## Universal principles

### Source of truth

- Source code always wins over docs, tests, or comments when they disagree.
- Prefer the `@vielzeug` MCP's source/docs lookup tools for API context before reading files one-by-one. Resolve the actual tool names via your client's MCP tool list — don't hardcode a numeric prefix (e.g. `mcp0_`); it's assigned per-client load order and isn't stable across sessions or tools.
- Consult `.ai/rules/conventions.md` (engineering conventions), `.ai/rules/catalogue.md` (packages + dep graph), and `.ai/rules/workspace.md` (toolchain + commands) as needed. Do not duplicate — reference them.

### Tests

- Never weaken, skip, or delete tests to make a phase pass — surface real failures instead.
- A failing test after a change means the implementation is incomplete, not the test.
- Only adjust a test when the behaviour it guards has intentionally changed.

### Scope and safety

- Do not commit, push, or publish without explicit user approval. Generating `rush change` files is fine; committing or pushing is not unless asked.
- Do not add runtime or dev dependencies without explicit instruction.
- Do not invent issues not grounded in actual source code.
- When uncertain, read more — use MCP or read a source before guessing at behavior.

## DOX chain

The DOX chain is the ordered read sequence before editing any package:

1. **Root `AGENTS.md`** — monorepo-wide AI agent contracts and guardrails
2. **`packages/AGENTS.md`** — shared per-package defaults
3. **`packages/<name>/AGENTS.md`** (if present) — package-local overrides that take precedence

Local contracts override defaults. Read the full chain before editing any package file. For workflow run artifacts (reading/writing `runs/<name>/`), read the root `AGENTS.md` only.

**Docs-focused workflows** (`/pkg-docs`, `/pkg-repl`) use `docs/AGENTS.md` in place of `packages/AGENTS.md` at step 2 — the chain is root `AGENTS.md` → `docs/AGENTS.md` → `packages/<name>/AGENTS.md`.

## Context pointers

Every workflow needs the same three rule files — link to them, never restate their content:

- Monorepo conventions → `.ai/rules/conventions.md`
- Package catalogue and dependency graph → `.ai/rules/catalogue.md`
- Toolchain commands → `.ai/rules/workspace.md`

`/pkg-docs` additionally needs `.ai/rules/doc-template.md` (page structures, tone rules, compliance checklists).

## Run artifacts

Workflow artifacts live under `.ai/workflows/runs/<name>/`. This directory is **gitignored** — it is scratch working state, not project history. Once a file is overwritten, its prior contents are gone unless the user copied them out first. Full lifecycle contract: `.ai/workflows/runs/AGENTS.md`.

| Artifact      | Purpose                                 | Persistence strategy                                |
| ------------- | --------------------------------------- | --------------------------------------------------- |
| `plan.md`     | Written by Phase 1; consumed by Phase 2 | **Overwrite** — single current plan                 |
| `progress.md` | Phase status + baseline metrics         | **Overwrite** — current state, not a log            |
| `review.md`   | Phase 3 findings (one section per lens) | **Append within run; overwrite at new cycle start** |
| `security.md` | Phase 4 findings (one section per pass) | **Append within run; overwrite at new cycle start** |

"New cycle" = a fresh `/pkg-workflow` invocation for the same package. Stale findings from a prior cycle are misleading — overwrite them.

## Universal execution model

### Checkpoints

After each pass, step, or lens, output a checkpoint summary before proceeding. The checkpoint format is defined locally in each workflow file. Checkpoints create a traceable audit trail and allow course correction.

### Decision framework

When facing ambiguity, apply this priority order:

1. **Source code is truth** — implementation wins over docs, tests, and comments when they disagree.
2. **Impact over style** — prefer behavior-oriented findings (correctness, DX, safety) over aesthetic ones.
3. **Minimal scope** — plan items must be actionable. Avoid "investigate X"; convert to concrete findings or defer.
4. **When uncertain, read more** — use MCP tools or read source files before guessing at behavior.

### Anti-patterns to avoid (all workflows)

- ❌ Do not invent issues not grounded in actual source code.
- ❌ Do not reference phantom file paths — spot-check before writing `plan.md`.
- ❌ Do not weaken, skip, or delete tests to make a phase pass — surface real failures.
- ❌ Do not commit, push, or publish without explicit user approval.
- ❌ Do not add runtime or dev dependencies without explicit instruction.
- ❌ Do not implement an item partially — exports, tests, and types must all be updated together.
- ❌ Do not write `plan.md` before completing all prescribed passes.
- ❌ Do not skip the cross-package propagation check — bugs that exist in one package often exist in siblings.

## Universal markers

These markers have the same meaning in every workflow. Workflow-specific markers are defined locally in each workflow file.

| Marker         | Meaning                                                           |
| -------------- | ----------------------------------------------------------------- |
| `[BLOCKED]`    | Cannot proceed — waiting for user input; present a recommendation |
| `[ESCALATE]`   | Breaking change or irreversible action — state tradeoffs and wait |
| `[SKIP]`       | Phase, step, or item not applicable — state the reason            |
| `[VERIFY]`     | Requires runtime or manual confirmation beyond static analysis    |
| `[PROPAGATED]` | Fix or pattern applied to sibling packages                        |
| `[DONE]`       | Item complete — code, tests, and lint all pass                    |
| `[FINDING]`    | Concrete problem or gap discovered in source                      |
| `[DEFERRED]`   | Item placed in Future improvements (out of immediate scope)       |

## Severity

`/pkg-review` and `/pkg-security` share one severity scale — a finding of a given severity means the same thing in both:

| Severity   | Meaning                                                                              | Fix-gate behaviour                                           |
| ---------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `CRITICAL` | Must fix — correctness, safety, or a confirmed vulnerability at risk                 | Blocks proceeding to the next lens/pass unless `[ESCALATE]`d |
| `MAJOR`    | Should fix — significant DX/design/type-safety issue, or a high-impact risky pattern | Blocks proceeding to the next lens/pass unless `[ESCALATE]`d |
| `MINOR`    | Worth fixing — low-risk improvement                                                  | Does not block; fix if time allows                           |
| `NIT`      | Optional polish                                                                      | Does not block                                               |

`/pkg-security` additionally tags each finding with a **status** (`[VULN]` confirmed / `[CONCERN]` risky pattern / `[SAFE]` checked clean) — status and severity are independent axes: a `[CONCERN]` can still be `CRITICAL` if left unaddressed it would become exploitable.

`/pkg-plan`'s category emojis (🔴 Bug / 🟠 Design / 🟡 Coverage / 🟢 Enhancement) are a _different_ axis — category, not severity — but rank in the same order: treat 🔴 as roughly `CRITICAL`/`MAJOR`, 🟠 as `MAJOR`/`MINOR`, 🟡–🟢 as `MINOR`/`NIT`, when you need to compare priority across workflows (e.g. deciding what to fix first when both a plan item and a review finding touch the same file).

`/pkg-tests`'s markers (`[GAP]`, `[ADDED]`, `[REMOVED]`, `[REWRITTEN]`) describe an _action taken_, not a severity — they have no equivalent in this table.

## Breaking change definition

A **breaking change** is any modification to a package's public API surface — exported types, function signatures, observable behavior of public functions, or removal/rename of exports — that requires callers to update their code.

Internal refactors, private function changes, and bug fixes that correct undocumented behavior are **not** breaking changes even if they alter runtime behaviour.

This definition applies across all workflows when deciding whether to use `[ESCALATE]`.

## Multi-pass convergence

Two different multi-pass shapes exist — do not treat them the same.

**Convergent phases (Plan, Implement)** — each pass is the _same_ activity (discover issues, implement remaining items) applied again. No fixed pass count:

- Minimum 1 pass, always.
- Stop when a pass adds 0 new findings / 0 remaining items — do not add a pass for zero value, even if that's pass 1.
- `> 5` new findings on what you expected to be the last pass → run one more pass and re-check.
- ~3 passes is typical for a mid-size package; small packages often converge in 1, large ones may need more. Never pad to hit a round number.

**Enumerated phases (Review's 3 lenses, Security's 3 surfaces)** — each pass targets a _distinct_, predefined concern (correctness / architecture / types; input-injection / leakage-types-deps / browser-server). All are mandatory regardless of size — skipping a lens skips a defect class, it isn't "converging early". Only add an extra pass beyond the enumerated set if a later lens's fix plausibly reintroduced an issue in an earlier lens's territory (targeted re-check, not a full restart of the rotation).
