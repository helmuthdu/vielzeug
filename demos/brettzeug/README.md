# Brettzeug: landing page

Static landing page for **Brettzeug**, a small independent studio building digital tools for tabletop games. It is a portfolio/studio page, not an app: one page, no routing, no backend.

The view layer is plain DOM built with `@vielzeug/ore` templates and `@vielzeug/refine` components (`ore-navbar`, `ore-button`, `ore-card`, `ore-icon`). The supplied tabletop photograph leads the hero; `@vielzeug/sentinel` powers reveal, active-section, and OS color-scheme tracking; `@vielzeug/ripple` holds the small amount of UI state. All page copy lives in `src/core/content.ts`, separated from presentation.

## Running it

```bash
pnpm install
pnpm dev
pnpm dev:local       # resolve @vielzeug/* directly to sibling package source
pnpm build
pnpm preview
pnpm test
```

`pnpm build` emits a fully static site in `dist/`: deploy it to any static host. Set `DEMO_BASE` / `DEMO_OUT_DIR` to build under a sub-path (same convention as the other demos).

## Structure

- `src/core/content.ts`: every string on the page, typed and tested.
- `src/core/reveal.ts`: one-shot IntersectionObserver reveal via sentinel.
- `src/core/scroll-spy.ts`: marks the navbar item for the section in view (`aria-current`).
- `src/core/scheme.ts`: light/dark: follows the OS until the visitor chooses, persists the choice, toggles `html.dark` per Refine's contract.
- `public/bg_hero.jpeg`: supplied tabletop hero image, full-bleed on desktop and uncropped on mobile.
- `@vielzeug/refine/code-window` frames the theme-matched Journal screenshot.
- `src/ui/app-shell.ts`: the whole page as one light-DOM `brettzeug-page` element.
- `src/ui/icons.ts`: the `ore-icon` glyphs the page registers (no `lucide` dependency).
- `src/styles/app.css`: palette as `light-dark()` pairs + layout on Refine design tokens.
- Mobile uses a five-section bottom dock; desktop uses the Refine navbar.

## Adding a future project

Add a constant to `content.ts`, extend the work section (or map over a list of projects), and add light and dark screenshots under `public/projects/`: the page shows the one matching the active scheme. Content and presentation stay separate.

## Attribution

The featured project, _Primal: The Hunter's Journal_, is an unofficial fan-made companion. _Primal: The Awakening_ is © and ™ Reggie s.r.l. (Reggie Games); the page states this explicitly and claims no affiliation.
