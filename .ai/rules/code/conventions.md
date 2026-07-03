# Vielzeug — Engineering Conventions

> Workspace toolchain and commands → `.ai/rules/process/workspace.md`
> Package catalogue and dependency graph → `.ai/rules/data/catalogue.md`

## Key conventions

- **Zero external dependencies** per package. Inter-package `workspace:*` deps are fine. Documented exceptions:
  - `refine` — bundles `lucide` as a runtime dependency (icons).
  - `refine`, `prism` — use `axe-core` as a devDependency for accessibility testing. It is not bundled and does not appear in production output.
- **TypeScript strict mode** everywhere. No `any`, no JS files in `src/`.
- **ESLint Perfectionist** enforces sorted imports and object keys — run `pnpm fix` to auto-sort.

## Teardown / disposal convention

Every resource object that requires explicit teardown follows one of two protocols.

### Sync disposable (the default)

```typescript
interface SomeHandle {
  dispose(): void;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  [Symbol.dispose](): void;
}
```

### Async disposable (only when teardown genuinely requires await — currently vault/IDB)

```typescript
interface AsyncHandle {
  dispose(): Promise<void>;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  [Symbol.asyncDispose](): Promise<void>;
}
```

**Rules:**

- **`dispose()`** is the canonical name. Never use `destroy()`, `disconnect()`, `close()`, or `cleanup()` for owned-resource teardown.
- **`readonly disposed: boolean`** — always present on disposable objects.
- **`readonly disposalSignal: AbortSignal`** — include when consumers may need to tie their own cleanup to this object's lifetime.
  - ✅ Add it if: the object is long-lived (not created and discarded within a single operation), and it's plausible a consumer would write `someSignal.addEventListener('abort', cleanup, { signal: handle.disposalSignal })`. Examples: buses, adapters, forms, worker pools, sourcerers.
  - ❌ Omit if: the object is created per-operation (query, mutation, batch job) or its lifetime is always shorter than the caller's.
- **`[Symbol.dispose]` / `[Symbol.asyncDispose]` ordering** is enforced automatically by ESLint. Run `pnpm fix` to auto-sort — do not manually reason about Symbol key ordering.
- Native platform APIs that return teardown functions (e.g. `autoUpdate() => () => void`) are **not** wrapped — leave them as plain functions.

## Dev logging standard

Every package follows a two-layer logging model. **Never mix the layers.**

### Layer 1 — Internal validation warnings (`src/_dev.ts`)

For API-misuse warnings that fire automatically in dev builds (bad config, mismatched types, missing attributes, etc.).

- Lives in a **private** `src/_dev.ts` — never exported from `index.ts` or `/devtools`.
- `isDev` is always `const` (never `export const`) — it is private implementation detail.
- Gated by `isDev` via `__<PKG>_PROD__` global (set by bundler `define`). **Never use `import.meta.env.DEV`** — library packages are consumed outside Vite contexts.
- Prefix format: `[@vielzeug/<pkg>] <description>` — emits via `console.warn` (warnings) or `console.error` (errors).
- **No bare `console.warn` / `console.error` in source** — always go through helpers from `_dev.ts`.
- `_dev.ts` exports the subset of helpers the package actually uses. Do not add helpers the package does not use.

| Helper                | When to use                                                               |
| --------------------- | ------------------------------------------------------------------------- |
| `warn(msg)`           | Unexpected API misuse; emits `console.warn`                               |
| `error(msg, ...args)` | Recoverable internal errors with extra context; emits `console.error`     |
| `devOnly(fn)`         | When dev-only logic requires more than a single `warn()` / `error()` call |

```typescript
// packages/<name>/src/_dev.ts
const isDev = !(globalThis as { __<NAME>_PROD__?: boolean }).__<NAME>_PROD__;

/** @internal */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/<name>] ${msg}`);
}

/** @internal */
export function error(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/<name>] ${msg}`, ...args);
}

/** @internal — Run fn only in dev builds. Use when dev-only logic goes beyond a single warn() / error() call. */
export function devOnly(fn: () => void): void {
  if (isDev) fn();
}
```

Add `@security` to `warn`'s JSDoc only when messages may include user-supplied data (PII risk).

### Layer 2 — Consumer debug observability (`src/devtools.ts` or `src/devtools/index.ts`)

For opt-in structured debug logging consumers import explicitly. Tree-shaken in production.

- Exported **only** from the `/devtools` sub-path (e.g. `import { debugBus } from '@vielzeug/herald/devtools'`).
- Uses `console.debug` (not `console.warn`).
- Wraps the public API — does not duplicate internal logic.
- No environment gate needed (consumers choose to import it).

### Rules

- **`_dev.ts` is never re-exported** from `index.ts`.
- Tests that assert warning output: spy on `console.warn` / `console.error`, do NOT import `_dev` directly.
- Expected message format in tests: `'[@vielzeug/<pkg>] <description>'`.

## Error class convention

Every package that throws typed errors has `src/errors.ts` with a base class hierarchy.

```typescript
// packages/<name>/src/errors.ts

/** Base class for all <name> errors. */
export class <Pkg>Error extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is <Pkg>Error {
    return err instanceof <Pkg>Error;
  }
}

/** Thrown when ... */
export class <Pkg>FooError extends <Pkg>Error {}

/** Thrown when ... (with extra fields) */
export class <Pkg>BarError extends <Pkg>Error {
  readonly code: string;
  constructor(code: string, message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.code = code;
  }
}
```

**Rules:**

- One base class `<Pkg>Error extends Error` — all subtypes extend the base, never `Error` directly.
- Base always has `this.name = new.target.name` and `Object.setPrototypeOf(this, new.target.prototype)`.
- `static is()` only on the base class.
- Use `opts?: ErrorOptions` for cause chaining — no custom `cause?: unknown` pattern.
- **No `[@vielzeug/<name>]` prefix in error messages** — the class name and module scope identify origin.
- Error classes live in `errors.ts` only — never in `types.ts` or mixed into `_types.ts`.
- Base class constructor requires `message: string` — no default message. Every subtype must supply a meaningful message; the class name alone is not enough context in a catch block.

## File layout & naming

```text
packages/<name>/src/
├── _dev.ts          ← always private (_-prefix = never re-exported from index.ts)
├── _<internal>.ts    ← private impl files (never re-exported)
├── errors.ts         ← public error types (exported from index.ts)
├── types.ts          ← public type definitions (exported from index.ts)
├── devtools.ts       ← optional Layer-2 debug logging, /devtools sub-path only
└── index.ts          ← sole public surface
```

**Rules:**

- `_` prefix means the file is **never re-exported** from `index.ts`.
- `errors.ts` and `types.ts` have **no** `_` prefix — they are public.
- Error classes must live in `errors.ts`, not `types.ts` or `_types.ts`.

## Package layout

```text
packages/<name>/
├── src/
│   ├── __tests__/     # vitest test files
│   └── index.ts       # public API — all exports defined here
├── dist/              # build output (gitignored)
├── package.json
└── vite.config.ts
```

## New-package scaffold

The steady-state layout above, at creation time. `new-package` mode (`/pkg-plan` and `/pkg-workflow`) must produce exactly these files — after scaffolding, register the package per `.ai/rules/process/workspace.md § New-package registration`:

```text
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

## Reference packages

When in doubt about structure, style, or test layout, copy an existing exemplar rather than inventing a new pattern:

- **`spell`** — canonical standard package shape. Study: `src/index.ts` (minimal public surface), `src/errors.ts` (base + subtypes), `src/__tests__/` (collocated test structure). Good model for any package with a focused API. **When creating a new package: copy `spell`'s structure, rename, and remove unneeded files.**
- **`arsenal`** — canonical tree-shakeable utility package. Study: `src/array/`, `src/object/` (one function per file), `src/index.ts` (barrel re-exports). Good model for cross-cutting utilities where tree-shaking matters.

## AI tooling

See `packages/codex/README.md` for MCP server setup and available tools.
