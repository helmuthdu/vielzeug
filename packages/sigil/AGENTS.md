# AGENTS.md — sigil

## Purpose

Accessible, themeable web components built on `craft`. Largest package; one custom element per component, organised by category folder (`content/`, `disclosure/`, `feedback/`, `inputs/`, `layout/`, `overlay/`), with headless logic under `headless/`.

## Ownership

- Parent contract: `packages/AGENTS.md` and `.devin/rules/conventions.md`.
- Usage docs: `docs/sigil/`.

## Local Contracts

- **`lucide` is an allowed external runtime dependency** (icons). This is the one documented exception to the monorepo zero-dependency rule. Do not add other external deps.
- **Per-component sub-path exports are generated, not hand-edited.** The `exports` map in `package.json` is driven by `sigil-manifest.mjs`:
  - `pnpm --filter @vielzeug/sigil run sync:exports` regenerates the export map after adding/renaming/moving a component.
  - `check:manifest` runs in `build` and fails if exports are out of sync — run `sync:exports` to fix.
- Build also emits a Custom Elements Manifest (`dist/custom-elements.json`) via `analyze`, and copies `src/styles/*.css` to `dist/styles`. CSS ships through the `./styles*` exports.
- `sideEffects` is set for `dist/*.js`, `dist/*.cjs`, and `dist/styles/**` — keep new side-effectful entry points covered.
- `src/_warn.ts` is private — never re-export.
- **DOM-output package** — excluded from the REPL. Do not add REPL examples or Monaco types for sigil.

## Accessibility testing

a11y is tested in **jsdom only** (no browser harness). Keep it reliable by asserting only what jsdom can actually evaluate:

- Each component test should call the global `axeCheck(element)` helper (`vitest.setup.ts`) and assert **zero violations**. It runs `wcag2a/2aa/best-practice` but **disables layout/style-dependent rules** (`color-contrast`, `target-size`, `scrollable-region-focusable`, …) that jsdom cannot compute — do **not** re-enable them in jsdom tests.
- Assert roles, names, and ARIA state with `@vielzeug/sigil/testing` helpers (`getAriaLabel`, `isAriaExpanded`, `getRole`, `queryPart`, …), and keyboard/focus behaviour via the `headless/` primitives (focus-trap, roving tabindex, announcer).
- **Out of automated scope** — verify in a real browser or by manual/visual review: colour contrast, target size, focus-visible, reflow, and anything needing real layout.
- Why: axe-core targets real browsers; jsdom has no CSS box model and a stubbed `getComputedStyle`, so the disabled rules produce false positives/negatives. (If a browser test harness is added later, move the visual rules there.)

## Work Guidance

- Depends on `arsenal`, `craft`, `grip`, `orbit`, `ripple`, `scroll`, `tempo` (`workspace:*`) plus `lucide`.
- Adding a component: create it under the right category folder, then run `sync:exports` so its sub-path export and types are wired.

## Verification

- Tests: **co-located** next to components (`src/<category>/<component>/<component>.test.ts`) plus shared suites under `src/headless/__tests__/` and `src/inputs/__tests__/`. Run the whole tree — `pnpm vitest run packages/sigil/src/` (or `pnpm --filter @vielzeug/sigil test`). The `.../src/__tests__/` path used by other packages misses most sigil tests.
- Lint (JS/TS): `pnpm --filter @vielzeug/sigil lint` (`eslint src`). This does **not** lint CSS — sigil ships many `.css` files; lint those from the repo root with `pnpm lint:css` (or `pnpm lint` for the whole repo).
- Build (includes `sync:exports` + `check:manifest` + manifest analyze): `pnpm --filter @vielzeug/sigil build`

## Child DOX Index

- None.
