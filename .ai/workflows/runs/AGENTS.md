# AGENTS.md — Workflow run artifacts

## Purpose

DOX leaf for `.ai/workflows/runs/`. This directory holds **ephemeral, per-package scratch state** produced by the `/pkg-*` workflows — it is not project documentation and not project history.

## Lifecycle contract

- **Gitignored.** `.ai/workflows/runs/` is excluded in the root `.gitignore`. Nothing here is ever committed, so "check git log for the old version" does not work — once a file is overwritten, its prior contents are gone unless a human copied them out first.
- **Scoped per package.** Each package gets its own `runs/<name>/` directory, unrelated to other packages.
- **Overwritten per cycle**, not appended forever. A "cycle" is one fresh `/pkg-workflow` invocation for a package. Every artifact follows the same rule: overwrite, always — see `.ai/rules/process/agent-execution.md § Run artifacts`.
- **Safe to delete, with confirmation.** These files are disposable scratch state — an agent may delete `runs/<name>/` when starting a genuinely fresh cycle, but must ask the user first (per the general destructive-operations rule): deleting mid-cycle work loses it permanently since it's not in git.

## Files

| File               | What it is                                                                    |
| ------------------ | ------------------------------------------------------------------------------ |
| `progress.md`      | Phase status, pass/round counts, baseline metrics — the resume/status record. |
| `plan.md`          | Current improvement plan (from `/pkg-plan`), consumed by `/pkg-implement`.    |
| `review.md`        | Code review findings (from `/pkg-review`).                                    |
| `security.md`      | Security audit findings (from `/pkg-security`).                               |
| `tests-report.md`  | Test suite coverage report (from `/pkg-tests`).                              |
| `repl-report.md`   | REPL example audit report (from `/pkg-repl`).                                |

## Local contracts

- Do not treat any file here as authoritative for what actually shipped — the package's own source, tests, and docs are the source of truth. These files only describe the _process_ that produced a change.
- Do not link to `runs/<name>/*` from committed docs (`docs/`, package `README.md`, etc.) — the target won't exist for anyone else since the directory isn't versioned.
