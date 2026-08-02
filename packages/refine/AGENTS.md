# AGENTS.md — refine

## Purpose

Accessible, themeable web components built on `ore`. Largest package; one custom element per component, organised by category folder (`content/`, `disclosure/`, `feedback/`, `inputs/`, `layout/`, `overlay/`), with headless logic under `headless/`.

## Ownership

- Parent contract: `packages/AGENTS.md` and `.ai/core/conventions.md`.
- Usage docs: `docs/refine/`.

## Local Contracts

- **`lucide` is an allowed external runtime dependency** (icons). This is the one documented exception to the monorepo zero-dependency rule. Do not add other external deps.
- **Ore IIFE boundary** — Refine imports all Ore runtime APIs from `@vielzeug/ore`, which the bundle config externalizes as the single `'Ore'` global. Do not reintroduce Ore runtime sub-path imports: an unexternalized sub-path can inline a second runtime whose lifecycle hooks are disconnected from `window.Ore`.
- **Per-component sub-path exports are generated, not hand-edited.** The `exports` map in `package.json` is driven by `scripts/refine-manifest.mjs`:
  - `pnpm --filter @vielzeug/refine run sync:exports` regenerates the export map after adding/renaming/moving a component.
  - `check:manifest` runs in `build` and fails if exports are out of sync — run `sync:exports` to fix.
- Build also emits a Custom Elements Manifest (`dist/custom-elements.json`) via `analyze`, and copies `src/styles/*.css` to `dist/styles`. CSS ships through the `./styles*` exports.
- `sideEffects` is set for `dist/*.js`, `dist/*.cjs`, and `dist/styles/**` — keep new side-effectful entry points covered.
- `src/_dev.ts` is private — never re-export.
- **DOM-output package** — excluded from the REPL. Do not add REPL examples or Monaco types for refine.
- **`--_*`-prefixed custom properties are a private contract between a component's own stylesheet and the shared mixins it composes in `styles: [...]`** (e.g. `sizeVariantMixin()` emits `--_gap`/`--_font-size`/`--_padding`; `colorThemeMixin` emits `--_theme-focus`/`--_theme-base`/`--_theme-shadow`/`--_theme-backdrop`). There is no compile-time check that a component's own CSS only reads `--_*` names an included mixin actually emits — a typo or a removed mixin silently no-ops (the variable falls back to its `var(..., fallback)` or to nothing) instead of erroring. When touching a component's `styles` array or its CSS, verify by inspection that every `--_*` variable it reads is emitted by one of its own `styles` entries.

## Accessibility testing

Two test layers cover different concerns.

### Layer 1 — jsdom (vitest, `pnpm test`)

- Each component test calls the global `axeCheck(element)` helper (`vitest.setup.ts`) and asserts **zero violations**. It runs `wcag2a/2aa/best-practice` but **disables layout/style-dependent rules** (`color-contrast`, `target-size`, `scrollable-region-focusable`, …) that jsdom cannot compute — do **not** re-enable them in jsdom tests.
- Assert roles, names, and ARIA state with `@vielzeug/refine/testing` helpers (`getAriaLabel`, `isAriaExpanded`, `getRole`, `queryPart`, …), and keyboard/focus behaviour via the `headless/` primitives (focus-trap, roving tabindex, announcer).
- Why jsdom can't do more: no CSS box model, `getComputedStyle` is stubbed, `@layer` blocks are silently dropped.

### Layer 2 — real browser (Playwright, `pnpm test:e2e`)

**Co-located next to the component**, same convention as jsdom `*.test.ts` files: `src/<category>/<component>/<component>.e2e.ts`. No dev server needed — loads the built IIFE stack via `page.setContent()`. Requires a prior `pnpm build`.

```bash
cd packages/refine
pnpm test:e2e                                      # run all e2e tests
pnpm test:e2e src/content/list/list.e2e.ts          # one component's e2e file
pnpm test:e2e -g "Accessibility"                    # every a11y describe block, any component
```

Each `*.e2e.ts` file groups its tests into `describe('Accessibility', ...)` / `describe('Interaction', ...)` / `describe('Layout', ...)` / `describe('Selection', ...)` etc. as needed — not every component needs every category, and multi-part components (`ore-list` + `ore-list-item`) share one file per the parent folder (`list.e2e.ts` covers both).

- **Accessibility** — full wcag2a/aa axe scan with `color-contrast` and `target-size` re-enabled (`axeCheck()`, shared from `src/testing/fixtures.ts`). Tests are scoped to `.frame` to avoid page-level false positives. A handful across the suite are marked `test.fail()` with documented reasons (shadow DOM axe limitations for select/tabs, genuine checkbox a11y gap, the list/list-item nested-interactive combo).
- **Layout** — CSS layout regression checks (flexbox geometry, overflow, padding ratios). `chat-message.e2e.ts` supersedes `scripts/verify-layout.mjs`'s chat-message scenarios.
- **Interaction** — open/close, focus-trap, keyboard navigation, gesture-driven state for overlay and composite components (dialog, accordion, tabs, tooltip, popover, list swipe actions).

**Adding a new e2e test:** add a `describe` block (or a new one) to the component's own `<component>.e2e.ts` (create it if this is the component's first e2e test), importing `test`/`expect`/`axeCheck` from `../../testing/fixtures` (path depth is always `category/component/` → two `../`). Call `refinePage.mountComponent(html)` to inject HTML and wait for upgrade. `src/testing/fixtures.ts` is Playwright-only shared harness/helper infrastructure (the real-browser counterpart to `src/testing/index.ts`'s jsdom helpers) — not a spec file, and not part of the public `@vielzeug/refine/testing` export (`index.ts` never imports it).

**Known shadow DOM limitation with axe:** axe-core's flat-tree traversal cannot pierce shadow boundaries for role-child relationships (e.g. `listbox > option`). Components where the ARIA role tree crosses the shadow/light boundary may produce false-positive violations. Mark these `test.fail()` with an explanation — they document known gaps, not real failures.

## Core Design Principles

Follow these when authoring or reviewing component styles and behaviour:

### Layout and Spacing
- **4-point grid** — all spacing and dimensions use multiples of 4 via `var(--size-*)`.
- **Whitespace** — sections breathe at 32 px / `var(--section-spacing)`; use proximity and containers to group related elements.
- **Responsiveness** — 12-col desktop, 8-col tablet, 4-col mobile.

### Typography
- Single sans-serif font via `var(--font-sans)`.
- Headers: letter-spacing `var(--tracking-header)` (−5%), line-height `var(--leading-tight)` (115%).
- Six font sizes max (`--text-xs` → `--text-2xl`); avoid sizes above 24 px on high-density pages.
- Hierarchy via size, weight, and color — most important content large/bold/top.

### Color and Depth
- One primary brand color; ramp it light for backgrounds, dark for text.
- Semantic roles: blue = info/primary, red = danger/error, yellow = warning, green = success.
- Dark mode: lighter card colors on darker backgrounds for depth; lower border contrast; dim accent saturation. Avoid heavy shadows.
- Shadows: subtle, low-opacity, high-blur. Popovers need stronger shadows than cards.

### Components
- **Buttons:** four states minimum (default, hover, active, disabled). Ghost buttons for secondary CTAs. Horizontal padding = 2× vertical (2:1 ratio).
- **Icons:** sized to body line height (24 px / `var(--leading-6)`).
- **Inputs:** clear focus and error states (red border + message).
- **Overlays:** linear gradient or progressive blur for text-over-image readability.

### Feedback and Interaction
- Every action gets a response (spinner, success message).
- Micro-interactions confirm actions subtly (e.g., chip slide-up).
- Signifiers (tooltips, active nav highlights) explain functionality without words.

## Design Modes

Named improvement lenses to guide AI-driven design work on components. Each lists its recommended combinations and what refine already covers.

| Mode | Intent | Recommended with | Refine coverage |
|------|--------|-----------------|----------------|
| **harden** | Error handling, text overflow, edge-case resilience | `normalize`, `clarify`, `adapt` | — |
| **normalize** | Match design system; ensure consistency | `extract`, `polish`, `harden` | Shared tokenized spacing/radius/typography/color mixins; consistent `focus-visible` outlines |
| **optimize** | Loading speed, rendering, animations, bundle size | `distill`, `adapt`, `animate` | Reduced-motion fallbacks; variant styling via reusable mixins |
| **polish** | Alignment, spacing, consistency — good → great | `normalize`, `clarify`, `quieter` | Refined helper/counter/label text; consistent focus ring and hover affordances |
| **bolder** | Amplify safe designs; more visual impact | `colorize`, `animate`, `delight` | Variant spectrum (solid/flat/bordered/outline/ghost/frost); optional rainbow/frost effects |
| **quieter** | Tone down visually aggressive designs | `distill`, `normalize`, `polish` | Text/ghost variants and tokenized contrast levels |
| **adapt** | Cross-device, cross-context consistency | `harden`, `optimize`, `onboard` | Small-screen dialog/drawer constraints; coarse-pointer touch targets; `dvh`-based overlay sizing |
| **clarify** | UX copy, error messages, labels, microcopy | `harden`, `polish`, `onboard` | Input helper/error separation + ARIA wiring; accessible labels for close/clear/loading/password actions |
| **distill** | Strip unnecessary complexity | `normalize`, `optimize`, `quieter` | Shared mixin architecture for size/rounded/color/state; no one-off per-component overrides |
| **animate** | Purposeful animations and micro-interactions | `delight`, `optimize`, `bolder` | Transition and keyframe usage on key interactions with reduced-motion fallback |
| **colorize** | Add strategic color to monochromatic UI | `bolder`, `normalize`, `polish` | Semantic theme colors via `colorThemeMixin`; variant styles use semantic theme roles |
| **delight** | Joy, personality, memorable moments | `animate`, `bolder`, `onboard` | Optional rainbow effect and frost variant |
| **onboard** | Onboarding flows, empty states, first-use UX | `clarify`, `adapt`, `distill` | Component-level labels, helper text, and error text patterns |
| **extract** | Consolidate reusable tokens and patterns | `normalize`, `distill`, `optimize` | Shared token and mixin layer is the default implementation path for new components |

## Work Guidance

- Depends on `arsenal`, `ore`, `dnd`, `orbit`, `ripple`, `tempo` (`workspace:*`) plus `lucide`.
- Adding a component: create it under the right category folder, then run `sync:exports` so its sub-path export and types are wired.

## Verification

- **Unit/component tests** (jsdom): `pnpm vitest run packages/refine/src/` or `pnpm --filter @vielzeug/refine test`. Tests are **co-located** next to components (`src/<category>/<component>/<component>.test.ts`) plus shared suites under `src/headless/__tests__/` and `src/inputs/__tests__/`. The `.../src/__tests__/` path used by other packages misses most refine tests.
- **E2E tests** (Playwright/Chromium): `pnpm --filter @vielzeug/refine test:e2e`. Requires a built dist (`pnpm --filter @vielzeug/refine build` first). Co-located next to components as `src/<category>/<component>/<component>.e2e.ts`; shared harness lives in `src/testing/fixtures.ts`.
- Lint (JS/TS): `pnpm --filter @vielzeug/refine lint` (`eslint src`). This does **not** lint CSS — refine ships many `.css` files; lint those from the repo root with `pnpm lint:css` (or `pnpm lint` for the whole repo).
- Build (includes `sync:exports` + `check:manifest` + manifest analyze): `pnpm --filter @vielzeug/refine build`

## Child DOX Index

- None.
