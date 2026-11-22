# AGENTS.md: prism

> Read when: working on `@vielzeug/prism` charts.

Responsive SVG charting library with explicit data updates. Each chart factory mounts an `<svg>` into a host container and returns a typed `ChartHandle` with `update()` and `dispose()`.

## Local contracts

- **DOM-output package**: renders SVG into the host DOM. REPL examples use the Preview pane (`docs/AGENTS.md`); register under `docs/.vitepress/theme/components/repl/examples/prism/`.
- Depends on `@vielzeug/orbit` and `@vielzeug/palette` (`workspace:*`). No other external runtime dependencies; color math (parse, luminance, mixing, formatting) comes from palette rather than local implementations.
- Tests live in `src/__tests__/`, one file per chart type plus shared suites for scales, animation, and internals. `vitest.setup.ts` stubs `ResizeObserver` (jsdom has none) and exposes the `axeCheck` global.

## Accessibility testing

**a11y coverage is a hard requirement for every chart factory.** It is tested in **jsdom only** (no browser harness). Keep assertions to what jsdom can reliably evaluate:

- Every chart test **must** call `await axeCheck(container)` and assert **zero violations**. The global `axeCheck` helper (defined in `vitest.setup.ts`) runs `wcag2a/2aa/best-practice` and **disables layout/style-dependent rules** (`color-contrast`, `target-size`, `scrollable-region-focusable`, …) that jsdom cannot compute: do **not** re-enable them in jsdom tests.
- Assert SVG accessibility structure: the root `<svg>` must carry `role="img"` (or an equivalent landmark), a `<title>` and/or `aria-label` for screen-reader identification, and `aria-hidden="true"` on purely decorative sub-elements (grid lines, tick marks, etc.).
- Assert ARIA live regions used by interactive features (tooltips, crosshair) expose correct `role`, `aria-live`, and text content.
- **Out of automated scope**: verify in a real browser or by manual/visual review: colour contrast of data series, focus-visible on interactive points, target size of hover targets, and anything requiring real layout or computed CSS.
- Why: axe-core targets real browsers; jsdom has no CSS box model and a stubbed `getComputedStyle`, so layout/colour rules produce false positives/negatives. (If a browser test harness is added later, move the visual rules there.)
