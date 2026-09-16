# AGENTS.md — Vielzeug

Canonical entrypoint for every AI client. `CLAUDE.md`, `.github/copilot-instructions.md`, and `.junie/AGENTS.md` point here instead of restating it. Repo-wide rules live in this file; task procedure lives in `.ai/tasks/`; engineering conventions live in `.ai/core/conventions.md`.

Vielzeug is a monorepo of independent TypeScript packages published as `@vielzeug/*`. Packages target ES2022, use strict TypeScript, and ship ESM and CJS builds through Vite.

## Start work

1. Inspect the worktree and preserve changes you did not make.
2. Pick the smallest task playbook that fits:

| Situation                                      | Read                    |
| ---------------------------------------------- | ----------------------- |
| Change code, tests, tooling, or CI             | `.ai/tasks/build.md`    |
| Investigate, audit, plan, or redesign          | `.ai/tasks/review.md`   |
| Update docs, README, recipes, or REPL examples | `.ai/tasks/document.md` |
| Prepare releases, commits, or pull requests    | `.ai/tasks/release.md`  |

3. Load the files in the task's `Load` section. Load `.ai/core/conventions.md` before editing package source.
4. Read the nearest subtree `AGENTS.md` before editing inside it (see the index at the end).

## Source of truth

1. Source code and package manifests win over docs, comments, and generated text.
2. Prefer the `codex` package's MCP data when available, but verify against source before changing code.
3. Do not use `git log`, `git diff`, or `git blame` as a default source of design truth.
4. Package facts (name, description, dependency graph) come from `packages/<name>/package.json`. `.ai/reference/packages.md` is a generated one-page view of the same data.

## Safety

- Do not commit, push, tag, release, publish, rewrite history, or delete branches without explicit approval for that action.
- Do not add dependencies without explicit approval.
- Do not weaken, skip, or delete tests to force a green run.
- If a change intentionally breaks public API, surface it clearly instead of hiding it behind compatibility code.

## Working style

- Prefer the smallest task that fits the work, direct code reading over speculation, and simple architecture over configurable architecture.
- Prefer deleting obsolete patterns to wrapping them.
- Treat demos as first-party integration harnesses. When a demo exposes a library gap, fix the owning package instead of adding a demo-only workaround, then cover both.
- Treat the monorepo as one owned system: propagate changes across packages, demos, tests, and docs when required for correctness and coherence.
- When valid approaches conflict, choose one definitive design favoring lower coupling, fewer moving parts, explicit behavior, and idiomatic TypeScript. Do not ship parallel alternatives unless explicitly required.
- Scale effort to the change. A one-function fix does not need every review pass, but scaling down never skips an approval gate, a required validation, or a fix for a confirmed security finding.

## Decision ownership and delegation

- Keep one decision owner per task. Delegated work gathers bounded evidence or implements an independently owned surface; it does not make conflicting product or architecture decisions.
- Delegate only when the subtask is self-contained enough to name its scope, required evidence, expected output, and write authority.
- Run delegated work concurrently only when scopes do not depend on or modify the same files.
- Treat delegated reports as evidence, not authority. Verify implementation-sensitive claims against source before editing or reporting completion.

## Escalate before proceeding when

- the baseline is already red and the task is not clearly about fixing it
- requirements are ambiguous enough to produce materially different designs
- the change would break multiple dependent packages
- the change needs a new dependency, data migration, or irreversible deletion

Surface the escalation with a `[BLOCKED]` marker instead of proceeding silently or burying it in prose.

## Structured markers

- `[BLOCKED] <decision>` — needs explicit user confirmation before proceeding.
- `[VERIFY] <claim>: <reason>` — a claim not directly confirmed from source (e.g. browser-only runtime behavior). Flag it instead of asserting it.
- `[DEFERRED] <work>: <reason>` — valuable but out of scope for this pass.

User-requested output formats take precedence, except that a safety gate always uses `[BLOCKED]`.

## Validation

Every code change finishes with the narrowest useful validation for the changed surface. The enforcement map in `.ai/core/conventions.md` is the single source of truth for which validation applies to which surface. Report commands that could not run and their exact failure; never infer success from inspection alone.

```bash
pnpm setup                                          # fresh checkout
pnpm vitest run packages/<name>/src/__tests__/      # standard test path
pnpm --filter @vielzeug/<name> lint
pnpm --filter @vielzeug/<name> build
pnpm validate:docs -- --package=<name>
pnpm validate:readme -- --package=<name>
pnpm validate:repl -- --package=<name>
pnpm --filter @vielzeug/codex build && pnpm docs:build   # docs changes (Codex bundles docs first)
pnpm check:ai-data                                  # AI metadata and .ai/ cross-references
```

Repository-wide: `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm fix`. Run `pnpm fix` for Biome formatting and import organization instead of hand-formatting. Run `pnpm run` with no arguments for the full script list; package-specific test behavior belongs in each package's `test` script.

## Toolchain and workflow facts

- Node 22 (`.tool-versions`), pnpm, Rush (`rush.json`, `common/`), Vitest, Biome, VitePress.
- Worktrees: `pnpm worktree:add <pkg>` only for packages with no `@vielzeug/*` dependency edge in either direction; the script checks live manifests.
- Change files: `node scripts/rush-change.mjs <name> <patch|minor|major> "<message>"`. Never `rush change --bulk`.
- Conventional commits: `feat(courier): add retry logic`. `fix` → patch, `feat` → minor, `feat!` or any breaking change → major.
- AI metadata: edit canonical `.ai/` sources, run `pnpm gen:ai-data`, then `pnpm check:ai-data`. Generated blocks and client task stubs are outputs, not editing surfaces.

## Repository layout

| Path                  | Purpose                                                        |
| --------------------- | -------------------------------------------------------------- |
| `packages/<name>/`    | Independent published packages                                 |
| `docs/<name>/`        | Package documentation and recipes (VitePress)                  |
| `demos/`              | Integration demos                                              |
| `scripts/`            | Workspace, generation, validation, and release tooling         |
| `.ai/`                | Conventions, task playbooks, and shared reference material     |
| `common/`, `rush.json`| Rush workspace configuration                                   |
| `.github/workflows/`  | CI and publishing workflows                                    |

### `.ai/` contents

- `core/conventions.md` — engineering conventions: public API design, disposal, errors, tests, diagnostics, file layout, enforcement map.
- `tasks/*.md` — task playbooks. Each file's frontmatter `description` feeds the generated `.claude/commands/` and `.devin/workflows/` stubs.
- `reference/packages.md` — generated package table; `docs-template.md`, `readme-template.md`, `security-checklist.md` — hand-curated, shared by tasks.

Every `.ai/...` path mentioned anywhere in the repo must resolve; `pnpm check:ai-data` fails on a dangling reference.

## Child AGENTS.md index

Subtrees carry their own `AGENTS.md` only when they have rules not covered here or in `.ai/core/conventions.md`; most packages intentionally have none.

- `packages/AGENTS.md` — source work for all `@vielzeug/*` libraries; indexes packages with extra local rules.
- `docs/AGENTS.md` — VitePress documentation site and REPL.
- `scripts/AGENTS.md` — repo tooling and the shared `scripts/lib/` primitives.
- `.github/AGENTS.md` — CI/CD workflows and the release automation they call.
