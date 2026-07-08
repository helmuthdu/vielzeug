# AGENTS.md — ore

## Purpose

Functional web-component authoring primitives built on `ripple`. The foundation `refine` is built on. Output is real DOM / custom elements.

## Ownership

- Parent contract: `packages/AGENTS.md` and `.ai/rules/code/conventions.md`.
- Usage docs: `docs/ore/`.

## Local Contracts

- **Multiple public entry points** — `.`, `./devtools`, `./directives`, `./forms`, `./observers`, `./testing`. Each maps to a `source`/`import`/`require`/`types` block in `package.json` `exports`. When adding or moving an entry point, update `package.json` `exports` and `vite.config.ts`'s `entry` map to match.
- `src/_dev.ts` is private — never re-exported from `index.ts` or any sub-path.
- Prop definitions use the `prop.*` factory in `src/props.ts` (`prop.string|bool|number|oneOf|json|data`). `prop.data` is the JS-only escape hatch for objects, arrays, callbacks, and any non-serialisable value; `prop.json` is for attribute-serialisable data. `prop.fn` has been removed — use `prop.data<FnType>()` instead.
- **No setup context bag.** `setup(props)` takes only `props`. Lifecycle hooks (`onMounted`, `onCleanup`, `onEvent`, `onElement`, `watchEffect`), host bindings (`bind`, `aria`), context (`inject`/`injectStrict`/`provide`), and per-instance factories (`useEmit<Emits>()`, `useSlots<SlotNames>()`) are all plain functions imported from `@vielzeug/ore`, resolved through the implicit current-component context (`runtime.ts`). This keeps them composable — any helper function called (transitively) from `setup()` can call them without a context object threaded through. `watchEffect` (not `watch`) avoids shadowing `@vielzeug/ripple`'s differently-shaped `watch(source, callback)`.
- Form-association helpers (`useField`, `createFormContext`) live under `./forms`, not the core export — most components don't need `ElementInternals` wiring.
- **DOM-output package** — excluded from the REPL (no preview container). Do not add `docs/.vitepress/.../repl/examples/ore/`.

## Accessibility testing

`ore` is a **primitive authoring library**, not a component library. Its a11y contract is narrower than `refine`'s or `prism`'s:

- **What to assert:** custom elements produced by `ore` primitives must not introduce structural violations — assert correct `role`, `tabindex`, `aria-*` attribute wiring, and slot/content projection plumbing. Use `axeCheck(element)` and assert zero violations on any test that mounts a real element into the DOM.
- **What is out of scope here:** full ARIA pattern correctness (e.g. combobox state, dialog focus trap, roving tabindex) — those are the responsibility of the consuming component library (`refine`). Do not duplicate those assertions in `ore` tests.
- Use the same `axeCheck` pattern from the repo (see `packages/refine/vitest.setup.ts` as a reference if adding it — `ore` does not currently ship an `axeCheck` helper but may add one if primitives require DOM-level a11y assertions).
- **Why the distinction matters:** breaking the primitive plumbing (e.g. a prop reflection bug that drops an `aria-*` attribute) would silently break all consuming components. The goal is to catch those regressions here, not to duplicate `refine`'s full-pattern tests.

## Work Guidance

- Depends on `@vielzeug/ripple` (`workspace:*`).
- Breaking changes here cascade to `refine` — verify `refine` after public-API changes.

## Verification

- Tests: `pnpm vitest run packages/ore/src/__tests__/`
- Lint: `pnpm --filter @vielzeug/ore lint`
- Build: `pnpm --filter @vielzeug/ore build`
- Downstream: `pnpm vitest run packages/refine/src/` after API changes.

## Child DOX Index

- None.
