# Vielzeug Engineering Conventions

> Workspace and commands: `.ai/core/workspace.md`
> Package metadata and dependency graph: `.ai/data/packages.json`

## Rule strength

- **MUST** — required unless user explicitly approves an exception.
- **SHOULD** — default; deviate only when the local design is clearer and rationale is evident from code.
- **MAY** — optional pattern.

## Non-negotiables

- **MUST:** Use TypeScript strict mode. No `any` in package source.
- **MUST:** Route public root exports through `src/index.ts`.
- **MUST:** Do not add a third-party runtime dependency without explicit approval. This does not prohibit `@vielzeug/*` workspace dependencies.
- **MUST:** Treat `package.json` as dependency authority. Use `.ai/data/packages.json` for agent-facing package facts and impact analysis.
- **MUST:** Keep source, tests, public exports, and user-facing examples consistent.

## Public API design

- **SHOULD:** Use an options object for 3+ independent parameters.
- **MAY:** Keep positional parameters when order is universal, required, and readable: `clamp(value, min, max)`.
- **MUST NOT:** Use positional booleans or same-primitive argument shapes that are hard to distinguish.
- **MUST:** Use `camelCase` for functions and `PascalCase` for types/classes.
- **MUST:** Update `src/index.ts`, types, docs, recipes, README, and REPL examples together when a public API changes.
- **MUST:** Treat renamed or removed exports as breaking until explicitly confirmed otherwise.
- **MUST NOT:** Add compatibility aliases, deprecated parallel APIs, or silent fallback behavior without explicit approval.

## Lifecycle and disposal

| Resource                     | `dispose()` | `disposed` | `disposalSignal`     | Symbol protocol           |
| ---------------------------- | ----------- | ---------- | -------------------- | ------------------------- |
| Long-lived stateful handle   | MUST        | MUST       | MUST                 | `[Symbol.dispose]()`      |
| Short-lived operation handle | MUST        | MUST       | omit                 | `[Symbol.dispose]()`      |
| Async teardown handle        | MUST        | MUST       | MUST when long-lived | `[Symbol.asyncDispose]()` |
| Native cleanup callback      | do not wrap | n/a        | n/a                  | n/a                       |

- **MUST:** Name owned-resource teardown `dispose()`, never `destroy()`, `disconnect()`, `close()`, or `cleanup()`.
- **SHOULD:** Reserve async disposal for teardown that genuinely requires `await`.
- **MAY:** Implement both `[Symbol.dispose]()` and `[Symbol.asyncDispose]()` only when synchronous abort and awaited drain have distinct guarantees. Document both guarantees beside methods.
- **MUST:** Let Biome apply safe formatting and import-organization fixes; run `pnpm fix` instead of hand-formatting.

```ts
interface SomeHandle {
  dispose(): void;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  [Symbol.dispose](): void;
}
```

## Errors

Public typed errors live in `src/errors.ts`.

```ts
export class PkgError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PkgFooError extends PkgError {}
```

- **MUST:** Define one `<Pkg>Error` base class; subtypes extend it, never `Error` directly.
- **MUST:** Use `instanceof <Pkg>Error` to narrow unknown values to the package error hierarchy.
- **MUST:** Use `opts?: ErrorOptions` for cause chaining.
- **MUST:** Supply a meaningful error message; do not prefix messages with `[@vielzeug/<pkg>]`.
- **MUST:** Export public error types from `src/index.ts`.

## Tests

- **MUST:** Organize tests by public behavior, feature, or domain; keep standard package tests under `src/__tests__/`.
- **MUST:** Assert observable behavior: returned values, public errors, side effects, lifecycle, or documented output.
- **SHOULD:** Keep one behavior or failure mode per test.
- **SHOULD:** Use deterministic inputs, clocks, randomness, and scheduling.
- **SHOULD:** Keep setup local and visible; use small helpers only when they clarify repeated domain setup.
- **MUST NOT:** Assert private state, internal helper calls, or incidental data structures unless that detail is public contract.
- **MUST NOT:** Use deep nested setup or mocks that obscure behavior under test.
- **SHOULD:** Remove obsolete, duplicated, brittle, or no-confidence tests during an intentional test-suite redesign.

## Internal logging and consumer devtools

### Internal diagnostics

Use private `src/_dev.ts` for development-only validation. Never mix it with consumer debug tooling.

- **MUST NOT:** Export `_dev.ts`.
- **MUST NOT:** Use `import.meta.env.DEV`; gate with `__<PKG>_PROD__` global.
- **MUST NOT:** Use bare `console.warn` or `console.error` in package source.
- **SHOULD:** Export only helpers actually used by the package.
- **MUST:** Format messages as `[@vielzeug/<pkg>] <description>`.
- **MUST:** Test warning output by spying on `console.warn` or `console.error`, never by importing `_dev.ts`.
- **SHOULD:** Add `@security` to `warn` JSDoc only when messages can include user-supplied data.

| Helper                | Use                                     |
| --------------------- | --------------------------------------- |
| `warn(msg)`           | Unexpected API misuse                   |
| `error(msg, ...args)` | Recoverable internal error with context |
| `devOnly(fn)`         | Multi-step development-only logic       |

### Runtime observability — `tap()`

Packages with runtime behavior (events, decisions, state transitions, background work) expose side-channel observation via a `tap()` method on the instance. This replaces per-package `debug<Noun>()` factories, `logger` options, and `onError` callbacks.

```ts
interface Tappable<Events extends { readonly type: string }> {
  tap(handler: (event: Events) => void, options?: { readonly signal?: AbortSignal }): () => void;
}
```

- **MUST:** Name the method `tap()`. Never `trace()`, `observe()`, `onAny()`, or `subscribe()` for generic runtime observation.
- **MUST:** Handler receives a single typed event object — a discriminated union with a `type` field. Never positional `(event, payload)` args.
- **MUST:** Return an unsubscribe function (`() => void`).
- **MUST:** Accept optional `{ signal?: AbortSignal }` — auto-detach when signal aborts.
- **MUST:** Swallow handler errors — observability must not affect package behavior.
- **MUST:** Zero overhead when no handlers registered (`if (tappers.size === 0) return` guard before emission).
- **MUST:** Export the event union type from `src/index.ts` as `<Pkg>Event` (e.g. `HeraldEvent`, `WardEvent`).
- **MUST NOT:** Provide a default logger. Consumer provides the handler.
- **MUST NOT:** Add `tap()` to packages without runtime observability (pure functions, simple state).
- **SHOULD:** Tie tapper lifetime to `disposalSignal` — clear all tappers on dispose.
- **SHOULD:** Emit a `{ type: 'dispose' }` event before clearing tappers, so observers can clean up.
- **SHOULD:** `tap()` after dispose returns a no-op unsubscribe. Packages with an explicit `DisposedError` class may throw instead for consistency with their other methods.

Rune integration (no adapter needed — rune's context-first `LogMethod` overload matches `(event, label)`):

```ts
import { createLogger } from '@vielzeug/rune';

const log = createLogger({ namespace: 'herald' });
const bus = createBus<MyEvents>();

bus.tap((event) => log.debug(event, `herald:${event.type}`));
```

Packages that implement `tap()`: herald, keymap, ward, postmaster, courier, pulse, scout.
Packages that don't (no runtime observability gap): vault (has `observe()`), spell, arsenal, ore, refine, dnd, orbit (visual overlay only), scroll, lingua, tempo, flux, focus, gesture, necromancer, sourcerer, coins, assay, illusionist, familiar, conduit, ledger, sentinel, wayfinder (has `subscribe()`), clockwork (has `subscribe()`), prism, ripple.

## File layout

```text
packages/<name>/src/
├── index.ts              required public root surface
├── __tests__/            package behavior tests
├── _dev.ts               internal diagnostics when needed
├── _*.ts                 private implementation as needed
├── errors.ts             public typed errors when needed
└── types.ts              standalone public types when needed
```

- **MUST:** Never re-export `_`-prefixed files from `index.ts`.
- **MAY:** Omit optional files. Do not create empty placeholders.

## New-package scaffold

Create:

```text
packages/<name>/
  package.json
  tsconfig.json
  tsconfig.declarations.json
  vitest.config.ts
  vite.bundle.config.ts
  vite.config.ts
  src/
    index.ts
    __tests__/
      <name>.test.ts
  README.md
```

Then:

1. Register package in `rush.json`.
2. Add curated `.ai/data/packages.json` metadata: `slug`, `name`, `category`, and `description`.
3. Add `docsContract` only for a durable nonstandard documentation architecture.
4. Run `.ai/tasks/document.md` after adding a public package surface.
5. Run `pnpm check:ai-data`.

Do not hand-edit docs alias maps or generated package lists; `scripts/vielzeug-packages.ts` derives them from valid package directories.

## Reference packages

- `spell` — small focused API, errors, types, and central tests.
- `arsenal` — tree-shakeable helper categories and barrel exports.
- `ripple` — disposal, async lifecycle, and devtools patterns.
- `ore` — DOM-output boundaries and accessibility testing.
- `codex` — CLI behavior, generated data, and bundled documentation.

## Enforcement map

| Convention / changed surface          | Enforcement                                                        |
| ------------------------------------- | ------------------------------------------------------------------ |
| Import/export ordering                | Biome organize imports                                             |
| Formatting                            | Biome / `pnpm fix`                                                 |
| Package source                        | focused tests, package lint, package build                         |
| Public API                            | package validation plus affected docs and REPL validation          |
| Tests only                            | focused tests; lint/build only when config or imports require them |
| Documentation                         | docs validation, Codex build, docs build                           |
| Demo or integration                   | owning-package validation when library behavior changes, affected demo tests/build, and `pnpm validate:demos` for shared or broad demo impact; add responsive/accessibility checks when relevant |
| REPL                                  | REPL validation, docs build                                        |
| Tooling                               | focused script tests and a direct smoke command                    |
| AI metadata                           | `pnpm check:ai-data`; run `pnpm gen:ai-data` first only when derived adapters or references must change |
| Release metadata                      | scoped artifact format and package/version intent                  |
| Cross-package call sites              | focused tests, lint, and build for every affected package          |
| Production dev-warning gate           | `pnpm verify:prod-gate`                                            |
