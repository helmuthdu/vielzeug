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

`.ai/workflows/runs/` accumulates `plan.md`, `progress.md`, `review.md`, and `security.md` files across packages and cycles. Stale artifacts from old cycles can mislead agents that load prior context. Most of the time this is a non-issue: agents overwrite artifacts within a cycle (see `.ai/rules/agent-execution.md § Run artifacts`), so a fresh `/pkg-workflow` invocation self-corrects without deleting anything.

**Only delete if stale context is actually causing confusion** (e.g. resuming logic in `pkg-workflow.md § Resuming an interrupted run` misfires because `progress.md` describes a different, older effort). This directory is gitignored — deleting is **irreversible**, there is no git history to recover from.

**Before running either command below, state what you're about to delete and ask the user to confirm.** Do not run it as a routine, unprompted "cleanup" step.

```bash
# Remove all run artifacts for a specific package
rm -rf .ai/workflows/runs/<name>/

# Remove all run artifacts for all packages
rm -rf .ai/workflows/runs/*/
```

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

## New-package scaffolding

When creating a new package (`new-package` mode in `/pkg-plan` and `/pkg-workflow`), the scaffold item must produce these files:

```
packages/<name>/
  package.json                  ← copy + adapt from a similar package; update name, version, description
  tsconfig.json                 ← extends ../../tsconfig.json; include src/**/*.ts
  tsconfig.declarations.json    ← emits .d.ts only; used by build:types script
  vitest.config.ts              ← copy from a similar package; points to src/__tests__/
  vite.config.ts                ← ESM + CJS dual build; lib.entry: src/index.ts
  src/
    index.ts                    ← empty barrel with a single comment: // exports go here
    __tests__/
      <name>.test.ts            ← describe('<name>', () => { it.todo('baseline') })
  README.md                     ← package name + one-liner + install snippet
```

After creating the files, register the package in:

- **`rush.json`** — add an entry to the `projects` array following the existing pattern
- **`pnpm-workspace.yaml`** — verify the existing `packages/**` glob already covers it (no change needed in most cases)
- **`docs/.vitepress/config.ts`** — add a `resolve.alias` entry: `'@vielzeug/<name>': resolve(__dirname, '../../packages/<name>/src')`

Run `pnpm --filter @vielzeug/<name> build` to confirm the scaffold is correct before proceeding.
