/**
 * Shared TypeScript types, prop bundles, and design-size presets for Refine components.
 *
 * Re-exports from four focused modules:
 * - `./types`: primitive type aliases and derived form-prop types
 * - `./prop-bundles`: reusable ore prop bundle objects
 * - `./size-presets`: sizeVariantMixin size preset constants
 * - `./layout-motion`: FLIP reflow motion shared by list-shaped components
 *
 * Component modules import these types directly; this module is not a public package boundary.
 */

export * from './layout-motion';
export * from './prop-bundles';
export * from './size-presets';
export * from './types';
