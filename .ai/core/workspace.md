# Vielzeug Workspace

Operational facts about the monorepo and its toolchain.

## Project

Vielzeug is a monorepo of independent TypeScript packages published under `@vielzeug/*`. Packages target ES2022 and ship ESM + CJS builds.

## Toolchain

- `pnpm` for package management
- `rush` for monorepo orchestration
- `vitest` for tests
- `eslint` and `stylelint` for linting
- Node 22

## Root commands

```bash
pnpm setup
pnpm build
pnpm test
pnpm lint
pnpm fix
pnpm docs:dev
pnpm docs:build
pnpm validate:repl
pnpm validate:repl -- --package <name>
pnpm gen:ai-data
pnpm check:ai-data
```

## Per-package commands

```bash
cd packages/<name>
pnpm build
pnpm test
pnpm lint
pnpm fix
```

Standard test path:

```bash
pnpm vitest run packages/<name>/src/__tests__/
```

Package-specific test overrides live in `.ai/data/packages.json`.

## Worktrees

Use `pnpm worktree:add <pkg>` only for packages with no `@vielzeug/*` dependency edge in either direction. The script checks live `package.json` data instead of trusting docs.

## Change files

Use the scoped helper instead of `rush change --bulk`:

```bash
node scripts/rush-change.mjs <name> <patch|minor|major> "<message>"
```

## Conventional commits

Format: `feat(courier): add retry logic`.

- `fix` → `patch` bump
- `feat` → `minor` bump
- `feat!` / any breaking change → `major` bump

## Scratch state

AI scratch state is gitignored under `.ai/state/` — see `.ai/state/AGENTS.md` for the contract (when to use it, file shapes, cleanup rules).

