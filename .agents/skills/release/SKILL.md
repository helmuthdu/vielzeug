---
name: release
description: 'Prepare delivery: change files, approved commits or pull requests, packed-package checks, and release diagnostics. Use when asked to commit, open a PR, write a change file, bump versions, publish, or diagnose a release or publish failure.'
---

# Release

This skill owns delivery mechanics. Code and PR quality assessment belongs to the `review` skill (`.agents/skills/review/SKILL.md`).

## Load

- root `AGENTS.md` (safety, change files, conventional commits, and validation policy)
- relevant subtree `AGENTS.md`
- the `review` skill for unassessed content being committed, submitted as a PR, or published; not for mechanical change-file authoring or read-only diagnostics
- `RELEASE.md` for train application, versioning, or publishing
- `scripts/AGENTS.md` for release-script changes or diagnostics; start at the relevant script entry point
- `.github/AGENTS.md` for workflow changes

## Preconditions

Follow the root `AGENTS.md` Safety policy for delivery approvals. Identify the requested action first: change-file authoring, diagnostics, commit/PR preparation, or release/publish. Before performing a delivery action, require explicit scope, public/release impact, content readiness, and validation status. Use `[BLOCKED]` when delivery readiness is unknown or required validation is red; mechanical authoring and read-only diagnostics do not start a quality-review loop.

## Flow

1. Confirm the requested action and affected package scope; assess public/release impact, review status, and validation status where that action requires them.
2. For commit/PR preparation, inspect the complete relevant diff and reuse existing quality-review evidence. Read commit history only when needed to establish scope or the comparison base; do not substitute diff inspection for content quality review.
3. For version-relevant package changes, create one scoped change file per package: `bun scripts/change.mjs <name> <patch|minor|major> "<message>"`. One package per call: never scan the working tree for pending change files.
4. Verify the artifacts and metadata required by the requested action are current; do not generate unrelated delivery artifacts for diagnostics or a change-file-only task.
5. For publish- or release-shaped verification, run `bun run verify:packed -- --package=@vielzeug/<name>` for each affected publishable package.
6. For a pull request, read `.github/pull_request_template.md` first and draft the body from it: preserve its headings, comments, and checklist, and fill placeholders with accurate content instead of substituting a generic body.
7. Perform only the explicitly approved delivery action, then report the resulting commit, pull request, tag, or diagnostic outcome. The user's explicit request supplies approval for that named action, not for subsequent delivery actions.

## Rules

- Treat docs changes as Codex release-relevant; the pre-commit hook writes codex's change file automatically.
- Versions are CalVer lockstep trains (`AGENTS.md`, `RELEASE.md`): there is no patch/minor/major bump to select. The change-file type only picks the CHANGELOG section: mirror the commit kind (`fix`/`feat`/breaking) for readability, never for versioning.
- Keep publishing diagnostics in scripts and workflows; do not bypass release checks or trusted-publishing controls.
- Packed verification consumes existing build output: build missing or stale affected packages and their dependency artifacts under root Build Scheduling first. It installs local tarballs, so a pass does not prove that dependency versions are available on npm; verify registry availability separately when diagnosing unpublished or dangling pins.

## Validation

| Surface             | Run                                                          |
| ------------------- | ------------------------------------------------------------ |
| Change files        | `bun run check:change-files`    |
| Packed delivery checks | `bun run verify:packed -- --package=@vielzeug/<name>` for publish/release verification, not change-file-only tasks |
| Release tooling     | `bun x vitest run scripts/release/` and `bun run ci:local` for `ci.yml` (see `.github/AGENTS.md`) |

## Report

- `Validation: <command>: <result>` for every executed check; list recommended or deferred checks separately
- `[DEFERRED] <artifact or check>: <reason>`
- `[BLOCKED] <approval or decision>`

Complete only when the requested scope and release impact are explicit; content quality for delivery was reviewed or is `[BLOCKED]`; the action's required change files and artifacts are current; and only explicitly approved delivery actions were performed.
