# Vielzeug Engineering Conventions

> Policy, commands, and workflow facts: root `AGENTS.md`
> Package metadata and dependency graph: `packages/<name>/package.json` (summarized in `.agents/reference/packages.md`)

## Rule strength

- **MUST** — required unless user explicitly approves an exception.
- **SHOULD** — default; deviate only when the local design is clearer and rationale is evident from code.
- **MAY** — optional pattern.

## Non-negotiables

- **MUST:** Use TypeScript strict mode. No `any` in package source.
- **MUST:** Route public root exports through `src/index.ts`.
- **MUST:** Do not add a third-party runtime dependency without explicit approval. This does not prohibit `@vielzeug/*` workspace dependencies (`workspace:*`). Documented exceptions: `refine` bundles `lucide`; `refine`, `prism`, and `ore` use `axe-core` as a devDependency for accessibility tests (never bundled).
- **MUST:** Treat `package.json` as the authority for name, description, and dependencies; use `.agents/reference/packages.md` for a one-page view during impact analysis.
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
- **SHOULD:** Name each test for the one observable behavior it asserts (`'returns null for an empty key'`), never a symbol or `'works'`.
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

To find current implementers, search for `tap(` in `packages/*/src`; do not maintain a list here.

Rune integration (no adapter needed — rune's context-first `LogMethod` overload matches `(event, label)`):

```ts
import { createLogger } from '@vielzeug/rune';

const log = createLogger({ namespace: 'herald' });
const bus = createBus<MyEvents>();

bus.tap((event) => log.debug(event, `herald:${event.type}`));
```

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

## New packages

Create a package with `pnpm new:package <name> "<description>"` (`scripts/new-package.mjs`). It writes the standard config files, the manifest (shared `devDependencies` come from `coins`), README, source and test stubs, the four `docs/<name>/` pages and one recipe, registers the project in `rush.json`, and refreshes generated data. Do not hand-create the scaffold; if the standard shape changes, change the script.

Do not hand-edit docs alias maps or generated package lists; `scripts/vielzeug-packages.ts` derives them from valid package directories.

## Reference packages

- `spell` — small focused API, errors, types, and central tests.
- `arsenal` — tree-shakeable helper categories and barrel exports.
- `ripple` — disposal, async lifecycle, and devtools patterns.
- `ore` — DOM-output boundaries and accessibility testing.
- `codex` — CLI behavior, generated data, and bundled documentation.
