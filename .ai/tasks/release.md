# Release Task

## Use when

Prepare delivery artifacts, create change files, assemble approved commits or pull requests, or diagnose release workflow behavior. Use `.ai/tasks/review.md` for code/PR quality assessment; this task owns delivery mechanics.

## Inputs

- `scope`
- `goal`
- `action`: change file, commit, pull request, release diagnosis, or publish

## Load

- `.ai/core/policy.md`
- `.ai/core/workspace.md`
- relevant `AGENTS.md` chain
- `.ai/tasks/review.md` when content quality has not already been assessed
- `.github/AGENTS.md` for workflow changes

## Preconditions

Never commit, push, tag, release, publish, rewrite history, or delete branches without explicit approval for that action. Before delivery, require a cleanly stated scope, public/release impact, and validation status. Use `[BLOCKED]` when content readiness is unknown or required validation is red.

## Flow

1. Confirm modified package scope, public/release impact, review status, and validation status.
2. Review status, the complete relevant diff, and commit history before drafting delivery content; do not substitute this for PR-mode quality review.
3. For version-relevant package changes, create one scoped Rush change file per package using `scripts/rush-change.mjs`.
4. Verify generated artifacts, package metadata, change files, and release metadata are current.
5. Record validation receipts as `command — result`; distinguish executed checks from recommended or deferred checks.
6. For publish or release-shaped package verification, run `pnpm verify:packed -- --package=@vielzeug/<name>` for affected publishable packages.
7. Perform the approved delivery action only after explicit confirmation, then report the resulting commit, pull request, tag, or diagnostic outcome.

## Rules

- Use `node scripts/rush-change.mjs <name> <patch|minor|major> "<message>"`; never use `rush change --bulk`.
- Treat docs changes as Codex release-relevant; Codex hook writes its change file automatically.
- Use conventional commit meaning for bump selection: `fix` patch, `feat` minor, breaking major.
- Keep publishing diagnostics in scripts and workflows; do not bypass release checks or trusted-publishing controls.

## Completion

Complete only when:

- delivery scope and release impact are explicit
- content quality was reviewed or is `[BLOCKED]`
- required change files and generated release artifacts are current
- validation receipts identify every executed, deferred, or unavailable check
- only explicitly approved delivery actions were performed

## Output

- `Validation: <command> — <result>`
- `[DEFERRED] <artifact or check>: <reason>`
- `[BLOCKED] <approval or decision>`
