# Vielzeug Engineering Conventions

> Workspace and commands: `.ai/core/workspace.md`
> Package metadata and dependency graph: `.ai/data/packages.json`

## Package rules

- Zero external runtime dependencies by default. Documented exceptions (verify against `package.json` before assuming this list is exhaustive): `refine` bundles `lucide` as a runtime dependency (icons); `codex` bundles `@modelcontextprotocol/sdk` (it *is* the MCP protocol implementation); `tempo` bundles `@js-temporal/polyfill` (the TC39 Temporal proposal isn't natively available everywhere yet). `refine`, `prism`, `ore` use `axe-core` as a devDependency for accessibility testing (not bundled).
- TypeScript strict mode everywhere.
- No `any` in package source.
- All public exports go through `src/index.ts`.

## API design

- 3 or more parameters → collapse into a single options object.
- Function names `camelCase`; types/classes `PascalCase`.
- Resources that own something expose `dispose()`, `disposed: boolean`, `disposalSignal: AbortSignal` (see Teardown below) — never a bare `console.log` for diagnostics; go through `_dev.ts` (see Dev logging below).

## Teardown

Owned resources use `dispose()` — never `destroy()`, `disconnect()`, `close()`, or `cleanup()`.

```ts
interface SomeHandle {
  dispose(): void;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  [Symbol.dispose](): void;
}
```

Include `disposalSignal` on long-lived stateful objects a consumer might tie their own cleanup to (buses, adapters, forms, worker pools). Omit it on objects created and discarded within a single operation (queries, mutations, batch jobs). `[Symbol.dispose]`/`[Symbol.asyncDispose]` key ordering is enforced by ESLint — run `pnpm fix` rather than reasoning about it manually. Native platform APIs that already return a teardown function (e.g. `autoUpdate() => () => void`) are not wrapped.

Async teardown is reserved for cases that genuinely require `await`.

## Dev logging

Internal warnings go through a private `src/_dev.ts`. Never mix this with the Layer 2 devtools below.

- never export `_dev.ts`
- never use `import.meta.env.DEV` — gate via `__<PKG>_PROD__` global instead (library packages run outside Vite contexts)
- never use bare `console.warn` or `console.error` in package source
- `_dev.ts` exports only the subset of helpers the package actually uses

| Helper | When to use |
| --- | --- |
| `warn(msg)` | Unexpected API misuse; emits `console.warn` |
| `error(msg, ...args)` | Recoverable internal errors with extra context; emits `console.error` |
| `devOnly(fn)` | Dev-only logic that needs more than a single `warn()`/`error()` call |

Message format: `` `[@vielzeug/<pkg>] <description>` ``. Tests that assert warning output spy on `console.warn`/`console.error` — they do not import `_dev` directly. Add `@security` to `warn`'s JSDoc only when messages may include user-supplied data.

## Devtools (Layer 2)

Opt-in structured debug logging exported only from a package's `/devtools` sub-path (e.g. `@vielzeug/herald/devtools`). Uses `console.debug`, tree-shaken in production, no environment gate — consumers choose to import it.

- Naming: always `debug<Noun>` — never `attach*`, `enable*`, `with*Debug`.
- **Factory-wrap** shape — when the primitive is normally obtained via `create<Noun>()`: `debug<Noun>` takes the same arguments and returns the same instance type, logging pre-wired. Examples: `debugCourier`, `debugBus`, `debugWard`, `debugRouter`, `debugMachine`, `debugFloat`, `debugEffect`.
- **Instance-attach** shape — when the primitive is normally already a live instance by the time you'd observe it: `debug<Noun>(existingInstance, options?)` subscribes to its public API and returns a plain `() => void` to stop observing. Never creates a new instance. Examples: `debugForm`, `debugSearch`.
- Exception: a global, process-wide hook installer for a real DevTools-extension inspector takes no `<Noun>` since it isn't instance-scoped — `installDevTools(hook)` (currently only `ripple`, alongside its own `debugEffect`).

## Error classes

Public typed errors live in `src/errors.ts`.

- one base `<Pkg>Error extends Error`
- subtypes extend the base, not `Error`
- use `opts?: ErrorOptions` for cause chaining

## File layout

```text
packages/<name>/src/
├── _dev.ts
├── _<internal>.ts
├── errors.ts
├── types.ts
├── devtools.ts
└── index.ts
```

## New-package scaffold

Create:

```text
packages/<name>/
  package.json
  tsconfig.json
  tsconfig.declarations.json
  vitest.config.ts
  vite.config.ts
  src/
    index.ts
    __tests__/
      <name>.test.ts
  README.md
```

Then register the package in:

- `rush.json` — required, hand-maintained (no generator writes this file).
- `.ai/data/packages.json` — required: add a curated entry (`slug`, `name`, `category`, `description`, `domOutput`, plus `testCommand` only if the package needs a non-standard test invocation). `pnpm check:ai-data`/`gen:ai-data` fails with "missing curated metadata" until this exists.

Do **not** hand-edit `docs/.vitepress/config.ts`'s `@vielzeug/*` alias map or the REPL/docs package lists — they're derived from the `packages/` directory listing via `scripts/vielzeug-packages.ts` (`buildVielzeugSrcAliases`, `listVielzeugPackages`). Adding the package directory with a valid `package.json` is enough.

## Reference packages

- `spell` — canonical small focused package
- `arsenal` — canonical multi-helper package

