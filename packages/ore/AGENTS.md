# AGENTS.md — ore

## Purpose

Functional web-component authoring primitives built on `ripple`. The foundation `refine` is built on. Output is real DOM / custom elements.

## Ownership

- Parent contract: `packages/AGENTS.md` and `.ai/core/conventions.md`.
- Usage docs: `docs/ore/`.

## Local Contracts

- **Root-only runtime API** — browser runtime APIs (directives and `useField`) are exported from `.`. `./testing` is the only public sub-path. Keep `package.json` `exports` and `vite.config.ts`'s entry map aligned.
- **IIFE build** — `vite.bundle.config.ts` bundles the root `src/index.ts` into `window.Ore`. Downstream IIFE consumers must import Ore only from `@vielzeug/ore`, so every lifecycle hook resolves through that single runtime.
- `src/_dev.ts` is private — never re-exported from `index.ts` or any sub-path.
- Prop definitions use the `prop.*` factory in `src/props.ts` (`prop.string|bool|number|oneOf|json|data`). `prop.data` is the JS-only escape hatch for objects, arrays, callbacks, and any non-serialisable value; `prop.json` is for attribute-serialisable data. `prop.fn` has been removed — use `prop.data<FnType>()` instead.
- **No setup context bag.** `setup(props)` takes only `props`. Lifecycle hooks (`onMounted`, `onCleanup`, `onEvent`, `onElement`, `watchEffect`), host bindings (`bind` — including reactive ARIA via `bind({ aria }, { target })`), context (`inject`/`injectStrict`/`provide`), and per-instance factories (`useEmit<Emits>()`, `useSlots<SlotNames>()`) are all plain functions imported from `@vielzeug/ore`, resolved through the implicit current-component context (`runtime.ts`). This keeps them composable — any helper function called (transitively) from `setup()` can call them without a context object threaded through. `watchEffect` (not `watch`) avoids shadowing `@vielzeug/ripple`'s differently-shaped `watch(source, callback)`.
- **Single branding mechanism.** All branded runtime objects (`HTMLResult`, internal directive/spread results, `LiveBinding`, `CSSResult`) are stamped via `makeBrand()` in `src/utils/brand.ts` (`Symbol.for`-keyed, survives duplicated module graphs). Context keys (`createContext`) are `Symbol.for`-based for the same reason. Never introduce `WeakSet`/`instanceof` identity checks for cross-API object recognition.
- **Unsafe HTML is explicit.** Root-exported `unsafeHtml()` does not sanitize and has no global sanitizer configuration. Callers must sanitize untrusted strings before passing them to the sink.
- **`live(signal)` is per-binding.** It returns a branded wrapper `{ source }` consumed by the attr binding engine — the "live" flag belongs to that one binding site, not the signal. There is no global live-signal registry to reset.
- **Error policy lives in `src/errors.ts`'s header** — API misuse throws `OreApiError`; user-code failures inside ore's execution report via `reportRuntimeError()`; recoverable oddities dev-`warn` and continue; internal impossibilities `invariant()`-throw. Never swallow silently.
- `useField` is a root export and owns only native `ElementInternals` integration; application form policy belongs to Forge.
- **DOM-output package** — excluded from the REPL (no preview container). Do not add `docs/.vitepress/.../repl/examples/ore/`.

## Accessibility testing

`ore` is a **primitive authoring library**, not a component library. Its a11y contract is narrower than `refine`'s or `prism`'s:

- **What to assert:** custom elements produced by `ore` primitives must not introduce structural violations — assert correct `role`, `tabindex`, `aria-*` attribute wiring, and slot/content projection plumbing. Use the global `axeCheck(element)` (defined in `vitest.setup.ts`, same pattern as `packages/refine/vitest.setup.ts`). Adopt it at the representative test for each structurally-distinct primitive area (host attr/class bindings, `bind({ aria })`, prop→attribute reflection, `useSlots()`, `each()`/`when()` DOM insertion) rather than on every one of the hundreds of individual `it()`s in the suite — the goal is one regression tripwire per code path that can drop or corrupt real DOM structure, not exhaustive per-assertion coverage.
- **What is out of scope here:** full ARIA pattern correctness (e.g. combobox state, dialog focus trap, roving tabindex) — those are the responsibility of the consuming component library (`refine`). Do not duplicate those assertions in `ore` tests.
- `axeCheck` is test-infrastructure only — it lives in `vitest.setup.ts`, not `src/`, so it is never bundled into the published package (matches the `axe-core` devDependency exception documented in `.ai/core/conventions.md`).
- **Why the distinction matters:** breaking the primitive plumbing (e.g. a prop reflection bug that drops an `aria-*` attribute) would silently break all consuming components. The goal is to catch those regressions here, not to duplicate `refine`'s full-pattern tests.

## Work Guidance

- Depends on `@vielzeug/ripple` (`workspace:*`). `@vielzeug/assay` is an **optional peer dependency** (`workspace:^`) used only by the `./testing` sub-path — production consumers never install it. The `^` keeps the published peer range from going stale on every assay version bump.
- Breaking changes here cascade to `refine` — verify `refine` after public-API changes.

## Verification

- Tests: `pnpm vitest run packages/ore/src/__tests__/`
- Lint: `pnpm --filter @vielzeug/ore lint`
- Build: `pnpm --filter @vielzeug/ore build`
- Downstream: `pnpm vitest run packages/refine/src/` after API changes.

## Child DOX Index

- None.
