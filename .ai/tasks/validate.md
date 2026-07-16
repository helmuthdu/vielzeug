# Validate Task

Use this for focused review, security, correctness, or coverage validation.

## Load first

- `.ai/core/policy.md`
- `.ai/core/workspace.md`
- relevant `AGENTS.md` chain

## Rigor

Default is `full` — run every requested module to the depth described below. Use `quick` (see `.ai/core/policy.md`) only for a narrowly-scoped, explicitly-named change; still apply the security final-scan gate below regardless of rigor.

## Validation modules

Pick only the modules that fit the change. For a full/requested audit, run all of them — they cover distinct defect classes, not increasing depth on the same one.

- **correctness** — logic and algorithm bugs, off-by-one errors, incorrect type narrowing, unhandled error paths, async correctness (unhandled rejections, missing `await`, race conditions), test coverage of main paths and edge cases.
- **design** — public API minimalism and consistency, naming/parameter/return-shape coherence, architecture boundaries (package doing too much or too little), duplication to extract, and dead `workspace:*` entries in `dependencies`/`devDependencies`.
- **types** — unnecessary or unsafe `as` casts and `!` assertions, types too broad or loose enough to allow misuse, missed opportunities to narrow types or model invariants, correct use of generics/conditional/mapped/template-literal types.
- **security** — see `.ai/reference/security-checklist.md` for the concrete checklist (injection, prototype pollution, information leakage, type-safety-at-runtime, dependency risk, browser-specific, server/API). **Final gate:** before finishing a security pass, re-confirm every finding raised during the pass is either `[FIXED]` or explicitly still open — never let a flagged vulnerability go unconfirmed at the end, regardless of rigor.
- **coverage** — check each public export for: happy-path coverage, negative tests (invalid/unexpected input), boundary tests (empty/min/max/large), async/race tests, type-guard tests (false case, not just true), cleanup/lifecycle tests (no leaked timers/listeners), and regression tests for any previously-known bug.

UI/DOM-output packages (`refine`, `ore`, `prism`) additionally require accessibility coverage — check the package's own `AGENTS.md` for its specific `axeCheck` contract before treating coverage as complete.

## Severity

Use one severity scale everywhere:

- `critical`
- `major`
- `minor`
- `nit`

## Output shape

For each finding, capture:

- severity
- area
- problem
- recommended fix
- whether it was fixed during the pass (`[FIXED]`) — see `.ai/core/policy.md`'s Structured markers for the full marker set (`[FINDING]`, `[DEFERRED]`, `[BLOCKED]`, `[VERIFY]`)

Keep the report concise. Persist only if someone else needs to resume the work.

