---
name: release
description: Prepare delivery — Rush change files, approved commits or pull requests, packed-package checks, and release diagnostics. Use when asked to commit, open a PR, write a change file, bump versions, publish, or diagnose a release or publish failure.
---

# Release

This skill owns delivery mechanics. Code and PR quality assessment belongs to the `review` skill (`.agents/skills/review/SKILL.md`).

## Load

- root `AGENTS.md` (safety, change files, conventional commits)
- relevant subtree `AGENTS.md`
- the `review` skill when content quality has not already been assessed
- `.github/AGENTS.md` for workflow changes

## Preconditions

Never commit, push, tag, release, publish, rewrite history, or delete branches without explicit approval for that action. Before delivery, require a cleanly stated scope, public/release impact, and validation status. Use `[BLOCKED]` when content readiness is unknown or required validation is red.

## Flow

1. Confirm modified package scope, public/release impact, review status, and validation status.
2. Review status, the complete relevant diff, and commit history before drafting delivery content; do not substitute this for PR-mode quality review.
3. For version-relevant package changes, create one scoped Rush change file per package: `node scripts/rush-change.mjs <name> <patch|minor|major> "<message>"`. Never `rush change --bulk`.
4. Verify generated artifacts, package metadata, change files, and release metadata are current.
5. For publish- or release-shaped verification, run `pnpm verify:packed -- --package=@vielzeug/<name>` for each affected publishable package.
6. Perform the approved delivery action only after explicit confirmation, then report the resulting commit, pull request, tag, or diagnostic outcome.

## Rules

- Treat docs changes as Codex release-relevant; the pre-commit hook writes codex's change file automatically.
- Use conventional commit meaning for bump selection: `fix` patch, `feat` minor, breaking major.
- Keep publishing diagnostics in scripts and workflows; do not bypass release checks or trusted-publishing controls.

## Validation

| Surface             | Run                                                          |
| ------------------- | ------------------------------------------------------------ |
| Change files        | `node common/scripts/install-run-rush.js change --verify`    |
| Publishable package | `pnpm verify:packed -- --package=@vielzeug/<name>`           |
| Release tooling     | `pnpm vitest run scripts/release/` and `pnpm ci:local` for `ci.yml` (see `.github/AGENTS.md`) |

## Report

- `Validation: <command> — <result>` for every executed check; list recommended or deferred checks separately
- `[DEFERRED] <artifact or check>: <reason>`
- `[BLOCKED] <approval or decision>`

Complete only when delivery scope and release impact are explicit; content quality was reviewed or is `[BLOCKED]`; required change files and generated release artifacts are current; and only explicitly approved delivery actions were performed.
