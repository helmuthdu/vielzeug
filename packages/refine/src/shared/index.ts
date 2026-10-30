/**
 * Shared TypeScript types, prop bundles, and design-size presets for Refine components.
 *
 * Re-exports from four focused modules:
 * - `./types`: primitive type aliases and derived form-prop types
 * - `./prop-bundles`: reusable ore prop bundle objects
 * - `./size-presets`: sizeVariantMixin size preset constants
 *
 * Component modules import these types directly; this module is not a public package boundary.
 * FLIP reflow motion is a public API and lives at `src/reflow.ts` instead.
 */

export * from './prop-bundles';
export * from './size-presets';
export * from './types';
