# Vielzeug AI Policy

Stable repo-wide rules for AI-driven work. Task docs should reference this file instead of restating the same guardrails.

## Source of truth

1. Source code wins over docs, comments, and generated text.
2. Structured metadata in `.ai/data/` wins over copied prose.
3. Prefer the `codex` package's MCP data when available, but verify against the source before changing code.
4. Do not use `git log`, `git diff`, or `git blame` as a default source of design truth.

## Safety

- Do not commit, push, release, or publish without explicit approval.
- Do not add dependencies without explicit approval.
- Do not weaken, skip, or delete tests to force a green run.
- If a change intentionally breaks public API, surface it clearly instead of hiding it behind compatibility code.

## Default working style

- Prefer the smallest task that fits the work.
- Prefer direct code reading over speculation.
- Prefer simple architecture over configurable architecture.
- Prefer deleting obsolete patterns to wrapping them.

## Escalate before proceeding when

- the baseline is already red and the task is not clearly about fixing it
- requirements are ambiguous enough to produce materially different designs
- the change would break multiple dependent packages
- the change needs a new dependency, data migration, or irreversible deletion

Surface an escalation with a `[BLOCKED]` marker (see Structured markers below) instead of proceeding silently or burying it in prose — a breaking change fixed quietly under review pressure is the single easiest way for this rule to get skipped in practice.

## Design decision ownership

Centralize shared decisions; decentralize implementation.

- The primary planner must resolve cross-cutting design decisions before delegating implementation.
- Give every shared design decision one owner and one recorded outcome.
- Keep delegated scopes disjoint by decision authority, not only by file path.
- Delegates may gather evidence and propose options, but must not independently choose a contract shared with another scope.
- When a delegate encounters an unresolved shared decision, return `[BLOCKED]` to the primary planner.
- Before integrating delegated work, verify API names, types, errors, lifecycle, exports, and documentation follow the same decisions.
- Record an ID, owner, outcome, and affected surfaces for a decision that changes a public contract, architecture boundary, or multiple delegated scopes.
- Keep decision registers for resumable work under `.ai/state/<scope>/`; do not encode run-specific decisions in canonical policy or task docs.

## Concurrent work

- Assign exclusive write ownership for each file or tightly coupled file group before concurrent work.
- Do not edit a file with an active conflicting owner.
- When overlapping work becomes necessary, stop and return `[BLOCKED]` with both scopes, files, and required reconciliation.
- One designated integrator reconciles conflicting changes; workers must not overwrite or abandon another scope's changes.
- Re-read final affected files before validating integrated work.

## Scope widening

- A worker may widen scope for a directly necessary internal coherence fix only when it changes no public API, package dependency, migration, or irreversible operation.
- Report widened scope with `[FIXED]`, affected files, rationale, and focused validation.
- For public or cross-package breakage, return `[BLOCKED]`; do not use compiler failures as delegation.

## Rigor

Two depths apply across `build` and `review` work, orthogonal to _scope_ (which files/modules/packages are in play):

- **`full`** (default) — the task doc's full depth applies: every listed check/pass runs, findings are ranked, and severity/impact gates are respected.
- **`quick`** — collapse every check/pass into one combined pass over the same scope. Use this for a small, explicitly-named change (one function, one bug) where running the full depth would be wasted effort. Never use `quick` to skip a fix-before-proceeding gate (e.g. a confirmed security finding) — rigor controls how much is analyzed, not whether a found issue gets fixed.

State which depth applied in one line at the top of the output (`Rigor: quick` / omit for the default `full`) so a reader doesn't have to infer it from what's missing.

## Structured markers

Use bracketed markers for greppable task output instead of inventing a new prose shape per run:

- `[FINDING]` — a raw observation, not yet actioned.
- `[FIXED]` — a finding resolved during the same pass; annotate inline (`... [FIXED]`) rather than deleting the original line.
- `[DEFERRED]` — valuable but out of scope for this pass; state why.
- `[BLOCKED]` — needs explicit user confirmation before proceeding (see Escalate above); state what decision is needed.
- `[VERIFY]` — a claim the agent could not directly confirm from source (e.g. runtime behavior only observable in a browser) — flag it instead of asserting it as fact.

A task doc may define additional domain-specific markers (e.g. `[GAP]` for a test-coverage hole) when these five don't fit; keep the same `[WORD]` shape so output stays greppable.

## Progress checkpoints

For multi-step work that touches more than a couple of files (cross-package propagation or review across several modules), emit a short checkpoint after each major step instead of one wall of output at the end:

```
✅ CHECKPOINT: <step> complete — <2-4 bullets: what changed, what's next>
```

This lets a human interrupt or redirect mid-run instead of only being able to react after everything is already done. Skip this for single-file, single-step changes — it's a tool for staying legible during a long run, not a formatting requirement everywhere.

## Validation expectations

Every code change should finish with the narrowest useful validation:

- package tests
- package lint/build where relevant
- docs or REPL validation when those surfaces changed

## State

Ephemeral run state belongs under `.ai/state/` — see `.ai/state/AGENTS.md` for the full contract (when to use it, file shapes, cleanup rules). Never encode the resumable state directly in canonical task docs.

Capture durable, source-verifiable surprises in the existing canonical `.ai` file that owns them. Keep run-specific, tentative, or unverified observations in `.ai/state/`; do not promote them without validation.
