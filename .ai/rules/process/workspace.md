# Vielzeug — Workspace & Toolchain

## Project

**Vielzeug** is a monorepo of **30 independent, zero-dependency TypeScript packages** published under the `@vielzeug/` npm scope. Each package ships ESM + CJS (Vite library mode), targets ES2022, and has strict TypeScript throughout.

## Toolchain

- **`pnpm`** for package management, **Rush** for monorepo orchestration (`pnpm setup` = `rush install`).
- **ESLint Perfectionist** enforces sorted imports and object keys — run `pnpm fix` to auto-sort.
- **Prettier** at 120-char line width, 2-space indent, trailing commas.
- **Node 22 required** (see `.nvmrc`).
- Tests live at `packages/<name>/src/__tests__/`. Run with `pnpm test` (vitest). Some packages co-locate tests next to source (e.g. `refine`) — see their `AGENTS.md`.

## Commands

### Root-level (monorepo-wide)

```bash
pnpm setup              # rush install — install all dependencies
pnpm build              # rush build — build all packages
pnpm test               # vitest — run all tests
pnpm lint               # eslint + stylelint
pnpm fix                # auto-fix JS (eslint --fix) and CSS (prettier + stylelint)
pnpm docs:dev           # VitePress dev server
pnpm docs:build         # build documentation
pnpm validate:repl      # validate all REPL examples (plain JS, no TS syntax)
pnpm validate:repl -- --package <name>   # validate one package's REPL examples
```

### Per-package

```bash
cd packages/<name>
pnpm build        # vite build (ESM + CJS) + tsc declarations
pnpm test         # vitest in watch mode
pnpm lint         # eslint src/
pnpm fix          # eslint --fix src/
```

## Multi-agent worktrees

When multiple agents work on different packages at the same time in one checkout, they race on `.git/index` (concurrent `git add`/`status`/`commit`) and can stomp each other's uncommitted files — hence the standing rule: never `git stash` to work around a collision, fix breaks in place instead.

For a package with **no `@vielzeug/*` dependency edge in either direction**, a git worktree removes the race entirely — separate working directory and index, same `.git/objects`, own branch. Use `scripts/worktree.mjs`, not raw `git worktree` commands — it checks the dependency graph first:

```bash
pnpm worktree:add <pkg>              # refuses if <pkg> has any @vielzeug dependency edge
pnpm worktree:add <pkg> -- --force   # override the refusal (see tradeoff below)
pnpm worktree:list
pnpm worktree:remove <pkg>
```

`add` creates `.worktrees/<pkg>/` (gitignored, inside the repo — not a sibling directory, so a sandboxed agent doesn't need an extra scope grant to use it), on a new `agent/<pkg>-<timestamp>` branch, and runs `rush install --to <pkg>` there (fast: pnpm's content-addressed store is shared across worktrees, so this is a link operation, not a re-download — a few seconds, not minutes).

**Why the refusal for coupled packages, not just a warning:** in a shared checkout, if agent A breaks `ripple`'s public API, agent B (on `ore`, which depends on it) sees the break on their very next command — that immediacy is what makes "fix in place" workable. Isolate the two in separate worktrees and that break goes silent until a branch merge — worse, not better, for coupled work. "Coupled" includes optional peer deps (e.g. `flux`'s adapters) — still a real API contract, just a looser one; `scripts/worktree.mjs` labels these `(optional)` in its refusal message so you know which kind of edge you'd be overriding with `--force`.

Independent packages have nothing to hide from each other, so isolation is a pure win there. `.ai/rules/data/catalogue.md`'s dependency graph is generated from `package.json` (`scripts/sync-catalogue.mjs`, CI-gated) so it no longer silently drifts — but `scripts/worktree.mjs` still checks live against `package.json` on every invocation rather than trusting the doc, since that's a zero-cost check for a command that's about to touch the filesystem anyway.

`remove` shells out to plain `git worktree remove`, which already refuses if the worktree has uncommitted changes — that safety is intentional, don't add `--force` to the script's remove path.

## Conventional commits

Use the format: `feat(courier): add retry logic`

- `feat` for new features → `minor` bump
- `fix` for bug fixes → `patch` bump
- `feat!` / breaking changes → `major` bump

## Versioning & releases

- Rush manages versioning via **change files**. After changing a publishable package, run `rush change` (non-interactive: `rush change --bulk --message "<summary>" --bump-type <patch|minor|major>`).
- Use `minor` for new features, `major` for breaking changes, `patch` for fixes.
- **Agents:** do not commit, push, or publish without explicit user approval — generating the change file is fine, committing it is not.

## Run artifact hygiene

`.ai/workflows/runs/` accumulates `plan.md`, `progress.md`, `review.md`, `security.md`, `tests-report.md`, and `repl-report.md` files across packages and cycles. Stale artifacts from old cycles can mislead agents that load prior context. Most of the time this is a non-issue: agents overwrite artifacts within a cycle (see `.ai/rules/process/agent-execution.md § Run artifacts`), so a fresh `/pkg-workflow` invocation self-corrects without deleting anything.

**Only delete if stale context is actually causing confusion** (e.g. resuming logic in `pkg-workflow.md § Resuming an interrupted run` misfires because `progress.md` describes a different, older effort). This directory is gitignored — deleting is **irreversible**, there is no git history to recover from.

**Before running either command below, state what you're about to delete and ask the user to confirm.** Do not run it as a routine, unprompted "cleanup" step.

```bash
# Remove all run artifacts for a specific package
rm -rf .ai/workflows/runs/<name>/

# Remove all run artifacts for all packages
rm -rf .ai/workflows/runs/*/
```

## Local MCP config

`.ai/mcp/mcp.json` points an MCP client at the in-repo `codex` build (`packages/codex/dist/cli.js`, relative to repo root — requires `pnpm --filter @vielzeug/codex build` first) for dogfooding during development. It is not the config external consumers should use — see `docs/codex/usage.md` for the published-package (`npx @vielzeug/codex`) setup.

## Dead-dep hygiene

Periodically audit each `package.json` `dependencies` and `devDependencies` against actual import usage. Dead `workspace:*` entries inflate the dependency graph and mislead the package catalogue — remove them and keep the dep graph in `catalogue.md` accurate.

## Per-package test command overrides

Most packages use the standard test command. These packages co-locate tests next to source and require the filter form instead:

| Package  | Command                               |
| -------- | ------------------------------------- |
| `refine` | `pnpm --filter @vielzeug/refine test` |

When a workflow says "use the correct test command for the package", check this table first. Add new entries here when additional packages adopt co-located tests.

Standard command (all other packages):

```bash
pnpm vitest run packages/<name>/src/__tests__/
```

## New-package registration

When creating a new package (`new-package` mode in `/pkg-plan` and `/pkg-workflow`), scaffold the file tree per `.ai/rules/code/conventions.md § New-package scaffold` first, then register it here:

- **`rush.json`** — add an entry to the `projects` array following the existing pattern
- **`pnpm-workspace.yaml`** — verify the existing `packages/**` glob already covers it (no change needed in most cases)
- **`docs/.vitepress/config.ts`** — add a `resolve.alias` entry: `'@vielzeug/<name>': resolve(__dirname, '../../packages/<name>/src')`

Run `pnpm --filter @vielzeug/<name> build` to confirm the scaffold is correct before proceeding.
