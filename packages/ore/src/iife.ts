/**
 * Aggregate entry for the IIFE bundle only (`vite.bundle.config.ts`) — merges
 * every public sub-path (index, directives, forms, observers) onto one flat
 * `window.Ore` namespace.
 *
 * Why this exists: the regular tree-shakeable build (`vite.config.ts`) keeps
 * `.`, `./directives`, `./forms`, `./observers` as separate ESM/CJS entry
 * points, each externalizing `@vielzeug/ore` — correct for bundler consumers,
 * but a plain `<script>` consumer with no module resolution (e.g. the docs
 * site's sandboxed `srcdoc` iframe preview, which can only execute flat global
 * scripts) needs everything on one global. Without this, a consumer bundling
 * against sub-paths that don't route through this single global — e.g.
 * `@vielzeug/ore/forms` — ends up inlining a *second*, independent copy of
 * ore's module graph (including `runtime.ts`'s module-level "current
 * component" pointer) instead of referencing the one already loaded on
 * `window.Ore`. That second copy's context is never set by real component
 * lifecycle, so every lifecycle hook resolved through it throws "outside
 * setup" — see `packages/refine/vite.bundle.config.ts` for the consumer side
 * of this fix (mapping `@vielzeug/ore/*` sub-path externals to the same
 * `Ore` global).
 *
 * Not part of the public `package.json` `exports` map — this file exists
 * solely as a build entry, never imported directly.
 */
export * from './directives/index';
export * from './forms/index';
export * from './index';
export * from './observers/index';
