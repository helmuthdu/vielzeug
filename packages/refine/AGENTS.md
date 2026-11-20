# AGENTS.md: refine

> Read when: working on `@vielzeug/refine` components, tokens, styles, or theme.

Accessible, themeable web components built on `ore`. Largest package; one custom element per component, organised by category folder (`blueprint/`, `content/`, `core/`, `feedback/`, `inputs/`, `layout/`, `navigation/`, `overlay/`; `icons/` is shared infrastructure). The single category map is `docs/.vitepress/theme/components/refineCategories.ts`: component docs and the docs sidebar generate from it, so a new or moved component updates the map, never a hand-maintained list. Depends on `arsenal`, `dnd`, `focus`, `gesture`, `keymap`, `necromancer`, `orbit`, `ore`, `ripple`, `scribe`, `sentinel`, `sigil`, and `tempo` (`workspace:*`; the generated table in `.agents/reference/packages.md` mirrors the manifest). `lucide` is an optional peer and a devDependency; `assay` is test-only.

## Local contracts

- **`lucide` is an optional external peer for the opt-in full-set registrar only.** Consumers importing `./icons/lucide/all` must declare their own Lucide dependency; core and the structural adapters must install and work without it. Core components use curated neutral SVG data with licenses in `THIRD_PARTY_NOTICES`; never import Lucide in core. Shared definitions, registration, defaults, and SVG helpers live in `src/icons/`; `./icons` exposes the common API. The pure `./icons/lucide` adapter accepts structural data; `./icons/lucide/all` explicitly registers the full library. `./icons/iconify` converts local Iconify data without a dependency or remote provider.
- **Ore IIFE boundary**: Refine imports all Ore runtime APIs from `@vielzeug/ore`, which the bundle config externalizes as the single `'Ore'` global. Do not reintroduce Ore runtime sub-path imports: an unexternalized sub-path can inline a second runtime whose lifecycle hooks are disconnected from `window.Ore`.
- **Family adapters are pure named-map converters.** `./icons/heroicons`, `./icons/tabler`, and `./icons/mdi` accept caller-supplied individual Iconify-format data, not framework components. They share the private `_iconify-map.ts` helper and the generic converter's validation; do not bundle data packs, add provider dependencies, or auto-register. Caller keys stay unchanged. Collections and aliases remain the `iconifyIcons` contract.
- **Per-component sub-path exports are generated, not hand-edited.** The `exports` map in `package.json` is driven by `packages/refine/scripts/refine-manifest.mjs`:
  - `bun run --filter @vielzeug/refine sync:exports` regenerates the export map after adding/renaming/moving a component.
  - `check:manifest` runs in `build` and fails if exports are out of sync: run `sync:exports` to fix.
- **A component that renders another component must TAG re-export it, never bare-import it.** The per-entry library build (Rolldown, `preserveModules`, 72+ entries) silently drops side-effect-only imports _between entry modules_, so `import '../icon/icon';` ships a sub-path that never registers its child. Write `export { ICON_TAG } from '../icon/icon';` instead: bindings survive cross-entry chunking, so importing the parent registers the child. Same-directory absorbed modules (`carousel-slide`, `datagrid-column`) are _not_ entries and bare-import fine. `check:cross-entry` runs in `build` and fails on both regressions: a bare entry import in `src/`, or a re-export whose link did not survive into `dist/`.
- Build also emits a Custom Elements Manifest (`dist/custom-elements.json`) via `analyze`, and copies `src/styles/*.css` to `dist/styles`. CSS ships through the `./styles*` exports.
- `sideEffects` covers `dist/*.js`, `dist/*.cjs`, `dist/core/*`, `dist/icons/**`, `dist/styles/**`, `src/content/icon/icon.ts`, `src/icons/defaults.ts`, and `src/icons/lucide/all.ts`: keep new side-effectful entry points covered. Both icon registrars and the icon component must survive production tree-shaking, including source-aliased consumers such as VitePress. Defaults never overwrite app registrations, in either import order.
- `src/_dev.ts` is private: never re-export.
- **DOM-output package**: REPL examples render in the Preview pane (`docs/AGENTS.md`); register under `docs/.vitepress/theme/components/repl/examples/refine/`. Examples mount web components into the sandbox `document.body`; do not rely on Monaco types for Refine-only APIs in the REPL editor.
- **`--_*`-prefixed custom properties are a private contract between a component's own stylesheet and the shared mixins it composes in `styles: [...]`** (e.g. `sizeVariantMixin()` emits `--_gap`/`--_font-size`/`--_padding`; `colorThemeMixin` emits `--_theme-focus`/`--_theme-base`/`--_theme-shadow`/`--_theme-backdrop`). There is no compile-time check that a component's own CSS only reads `--_*` names an included mixin actually emits: a typo or a removed mixin silently no-ops (the variable falls back to its `var(..., fallback)` or to nothing) instead of erroring. When touching a component's `styles` array or its CSS, verify by inspection that every `--_*` variable it reads is emitted by one of its own `styles` entries.

## Accessibility testing

Two test layers cover different concerns.

### Layer 1: jsdom (vitest, `bun run test`)

- Each component test calls the global `axeCheck(element)` helper (`vitest.setup.ts`) and asserts **zero violations**. It runs `wcag2a/2aa/best-practice` but **disables layout/style-dependent rules** (`color-contrast`, `target-size`, `scrollable-region-focusable`, …) that jsdom cannot compute: do **not** re-enable them in jsdom tests.
- Assert roles, names, and ARIA state with `@vielzeug/assay` and keyboard/focus behaviour through the component's visible DOM contract.
- Why jsdom can't do more: no CSS box model, `getComputedStyle` is stubbed, `@layer` blocks are silently dropped.

### Layer 2: real browser (Playwright, `bun run --filter @vielzeug/refine test:e2e`)

**Co-located next to the component**, same convention as jsdom `*.test.ts` files: `src/<category>/<component>/<component>.e2e.ts`. No dev server needed: loads the built IIFE stack via `page.setContent()`. Requires a prior `bun run --filter @vielzeug/refine build:e2e` (refine's own IIFE bundle + `dist/styles`; ~1s, no type/manifest/packed gates). Use the full `bun run --filter @vielzeug/refine build` when the run validates the shipped artifact itself (types, CEM, per-entry dist) or when dependency packages changed.

Follow root Build Scheduling: iterate with focused jsdom tests and the source-backed docs preview, then build Refine once after the implementation changes and batch the affected e2e files against that output. Do not build once per component or test file. E2E-test-only edits can reuse that build; changes to bundled source/styles or consumed dependency artifacts require a fresh build before the next e2e run. If an earlier dist-backed check is necessary, explain why before building; never substitute a stale-dist test pass for validation of source edits.

```bash
cd packages/refine
bun run test:e2e                                      # run all e2e tests
bun run test:e2e src/content/list/list.e2e.ts          # one component's e2e file
bun run test:e2e -g "Accessibility"                    # every a11y describe block, any component
```

Each `*.e2e.ts` file groups its tests into `describe('Accessibility', ...)` / `describe('Interaction', ...)` / `describe('Layout', ...)` / `describe('Selection', ...)` etc. as needed: not every component needs every category, and multi-part components (`ore-list` + `ore-list-item`) share one file per the parent folder (`list.e2e.ts` covers both).

- **Accessibility**: full wcag2a/aa axe scan with `color-contrast` and `target-size` re-enabled (`axeCheck()`, shared from `src/testing/fixtures.ts`). Tests are scoped to `.frame` to avoid page-level false positives. A handful across the suite are marked `test.fail()` with documented reasons (shadow DOM axe limitations for select/tabs, genuine checkbox a11y gap, the list/list-item nested-interactive combo).
- **Layout**: CSS layout regression checks (flexbox geometry, overflow, padding ratios). `chat-message.e2e.ts` covers chat-message geometry in Chromium.
- **Interaction**: open/close, focus-trap, keyboard navigation, gesture-driven state for overlay and composite components (dialog, accordion, tabs, tooltip, popover, list swipe actions).

**Adding a new e2e test:** add a `describe` block (or a new one) to the component's own `<component>.e2e.ts` (create it if this is the component's first e2e test), importing `test`/`expect`/`axeCheck` from `../../testing/fixtures` (path depth is always `category/component/` → two `../`). Call `refinePage.mountComponent(html)` to inject HTML and wait for upgrade. `src/testing/fixtures.ts` is private Playwright-only shared harness/helper infrastructure, not a spec file.

**Known shadow DOM limitation with axe:** axe-core's flat-tree traversal cannot pierce shadow boundaries for role-child relationships (e.g. `listbox > option`). Components where the ARIA role tree crosses the shadow/light boundary may produce false-positive violations. Mark these `test.fail()` with an explanation: they document known gaps, not real failures.

## Design principles and modes

Authoring guidance for component styles and behaviour (4-point grid, type scale, color roles, the named improvement lenses) lives in [`.agents/reference/refine-design.md`](../../.agents/reference/refine-design.md). Load it when shaping or reviewing component styling; the code rules below always apply.

## Adding a component

Create it under the right category folder, then run `sync:exports` so its sub-path export and types are wired.

## Verification

Default gates: root `AGENTS.md` → **Project profile**. Refine-specific paths below.

- **Unit/component tests** (jsdom): while iterating run the component's own test file (`bun x vitest run packages/refine/src/<category>/<component>/<component>.test.ts`); the full-suite final gate is `bun x vitest run packages/refine/src/` or `bun run --filter @vielzeug/refine test`. Tests are **co-located** next to components (`src/<category>/<component>/<component>.test.ts`) plus shared suites under `src/core/__tests__/` and `src/inputs/__tests__/`. The `.../src/__tests__/` path used by other packages misses most refine tests.
- **E2E tests** (Playwright/Chromium): scope `bun run --filter @vielzeug/refine test:e2e` to the affected `src/<category>/<component>/<component>.e2e.ts` files. Reuse fresh output from the required final package build; use `build:e2e` only when an earlier browser check needs artifacts. Follow Layer 2 above for artifact freshness and dependency changes; shared harness lives in `src/testing/fixtures.ts`.
- Lint: `bun run --filter @vielzeug/refine lint` (`biome ci src`). This checks TypeScript and CSS in Refine source.
- Build (includes `sync:exports` + `check:manifest` + manifest analyze): `bun run --filter @vielzeug/refine build`
