# AGENTS.md — ore

## Purpose

Functional web-component authoring primitives built on `ripple`. The foundation `refine` is built on. Output is real DOM / custom elements.

## Ownership

- Parent contract: `packages/AGENTS.md` and `.ai/rules/code/conventions.md`.
- Usage docs: `docs/ore/`.

## Local Contracts

- **Multiple public entry points** — `.`, `./devtools`, `./directives`, `./forms`, `./observers`, `./testing`. Each maps to a `source`/`import`/`require`/`types` block in `package.json` `exports`. When adding or moving an entry point, update `package.json` `exports` and `vite.config.ts`'s `entry` map to match.
- **`src/iife.ts` is a separate, IIFE-only aggregate entry** (index + directives + forms + observers merged onto one `window.Ore` global), built only by `vite.bundle.config.ts` — not part of `package.json` `exports`, excluded from `tsconfig.declarations.json`. It exists for consumers with no module resolution (the docs site's sandboxed `srcdoc` preview). **When adding a new sub-path export, add it to `src/iife.ts` too**, and add the matching `@vielzeug/ore/<subpath>` → `'Ore'` mapping to any downstream IIFE consumer's `globals` (currently `packages/refine/vite.bundle.config.ts`). Skipping either step doesn't error at build time — it silently inlines a second, disconnected copy of ore's module graph (including `runtime.ts`'s "current component" state) into the consumer's bundle, so every lifecycle hook resolved through it throws "outside setup" at runtime. This exact regression is what prompted this contract; see the `entry`/`globals` fix in both packages' `vite.bundle.config.ts` for the reference shape.
- `src/_dev.ts` is private — never re-exported from `index.ts` or any sub-path.
- Prop definitions use the `prop.*` factory in `src/props.ts` (`prop.string|bool|number|oneOf|json|data`). `prop.data` is the JS-only escape hatch for objects, arrays, callbacks, and any non-serialisable value; `prop.json` is for attribute-serialisable data. `prop.fn` has been removed — use `prop.data<FnType>()` instead.
- **No setup context bag.** `setup(props)` takes only `props`. Lifecycle hooks (`onMounted`, `onCleanup`, `onEvent`, `onElement`, `watchEffect`), host bindings (`bind`, `aria`), context (`inject`/`injectStrict`/`provide`), and per-instance factories (`useEmit<Emits>()`, `useSlots<SlotNames>()`) are all plain functions imported from `@vielzeug/ore`, resolved through the implicit current-component context (`runtime.ts`). This keeps them composable — any helper function called (transitively) from `setup()` can call them without a context object threaded through. `watchEffect` (not `watch`) avoids shadowing `@vielzeug/ripple`'s differently-shaped `watch(source, callback)`.
- Form-association helpers (`useField`, `createFormContext`) live under `./forms`, not the core export — most components don't need `ElementInternals` wiring.
- **DOM-output package** — excluded from the REPL (no preview container). Do not add `docs/.vitepress/.../repl/examples/ore/`.

## Accessibility testing

`ore` is a **primitive authoring library**, not a component library. Its a11y contract is narrower than `refine`'s or `prism`'s:

- **What to assert:** custom elements produced by `ore` primitives must not introduce structural violations — assert correct `role`, `tabindex`, `aria-*` attribute wiring, and slot/content projection plumbing. Use the global `axeCheck(element)` (defined in `vitest.setup.ts`, same pattern as `packages/refine/vitest.setup.ts`). Adopt it at the representative test for each structurally-distinct primitive area (host attr/class bindings, `aria()`, prop→attribute reflection, `useSlots()`, `each()`/`when()` DOM insertion) rather than on every one of the hundreds of individual `it()`s in the suite — the goal is one regression tripwire per code path that can drop or corrupt real DOM structure, not exhaustive per-assertion coverage.
- **What is out of scope here:** full ARIA pattern correctness (e.g. combobox state, dialog focus trap, roving tabindex) — those are the responsibility of the consuming component library (`refine`). Do not duplicate those assertions in `ore` tests.
- `axeCheck` is test-infrastructure only — it lives in `vitest.setup.ts`, not `src/`, so it is never bundled into the published package (matches the `axe-core` devDependency exception documented in `.ai/rules/code/conventions.md`).
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
