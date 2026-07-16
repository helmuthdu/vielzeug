# GitHub Copilot — Workspace Instructions

## Project

**Vielzeug** is a monorepo of independent, zero-dependency, tree-shakeable TypeScript packages published under the `@vielzeug/*` npm scope. Each package ships ESM + CJS (Vite library mode), targets ES2022, and has strict TypeScript throughout.

## Canonical references — read before editing

Package count, the dependency graph, and the catalogue change often enough that duplicating them here just goes stale. Treat these as the single source of truth instead:

- **AI system entrypoint** — `.ai/README.md`
- **Engineering conventions** (disposal, dev logging, error classes, file layout) — `.ai/core/conventions.md`
- **Package catalogue & dependency graph** — `.ai/data/packages.json` and `.ai/reference/packages.md`
- **Workspace toolchain & commands** — `.ai/core/workspace.md`
- **Root agent contract** — `AGENTS.md` (indexes child `AGENTS.md` files per subtree)
- **Contributor workflow** — `.github/contributing.md`

## Quick commands

```bash
pnpm setup   # rush install — install all dependencies
pnpm build   # rush build — build all packages
pnpm test    # vitest — run all tests
pnpm lint    # eslint + stylelint
pnpm fix     # auto-fix JS (eslint --fix) and CSS (prettier + stylelint)
```

Per-package: `cd packages/<name> && pnpm build|test|lint|fix`. Test path convention and per-package overrides are documented in `.ai/core/workspace.md` and `.ai/data/packages.json`.

## Key conventions (summary — full detail in conventions.md)

- Zero external runtime dependencies per package; `workspace:*` deps between packages are fine.
- TypeScript strict mode everywhere — no `any`, no JS files in `src/`.
- ESLint Perfectionist enforces sorted imports/object keys — run `pnpm fix`, don't hand-sort.
- Conventional commits: `feat(courier): add retry logic`.
- All public exports go through `packages/<name>/src/index.ts`.

## Tasks

Canonical AI task definitions live in `.ai/tasks/`. Read the smallest task that fits the job:

| Need | Task file |
| --- | --- |
| Review or redesign a package | `.ai/tasks/analyze.md` |
| Implement a package or repo change | `.ai/tasks/change.md` |
| Run focused review / security / coverage checks | `.ai/tasks/validate.md` |
| Sync docs | `.ai/tasks/docs.md` |
| Update REPL examples | `.ai/tasks/repl.md` |

## AI integration (`codex`)

The `codex` package is an MCP server exposing all Vielzeug docs/APIs to AI clients:

```sh
cd packages/codex && pnpm build     # build once
node packages/codex/dist/index.js   # stdio (Claude Desktop, Copilot Chat)
node packages/codex/dist/index.js --port 3100   # HTTP (remote agents)
```

Available MCP tools: `list-packages`, `search-packages`, `list-docs-pages`, `get-docs`, `get-package-api`, `get-ai-context`, `list-components`, `get-component`. Prefer these over reading files one-by-one when looking up another package's API.

## Common import patterns

```typescript
import { computed, effect, signal } from '@vielzeug/ripple'; // reactive state
import { createForm } from '@vielzeug/forge'; // forms
import { s } from '@vielzeug/spell'; // validation
import { createApi, createQuery } from '@vielzeug/courier'; // HTTP + caching
import { createLocalStorage, table } from '@vielzeug/vault'; // storage
import { createContainer, createToken } from '@vielzeug/conduit'; // DI container
```
