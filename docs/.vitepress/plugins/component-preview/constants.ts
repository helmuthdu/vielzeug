// Browser-safe constants shared between the Vite plugin (Node) and the theme
// client code. This file has no Node.js imports so it can be bundled for the
// browser without triggering externalization warnings.

export const REFINE_CSS_HMR_EVENT = 'refine-preview:css-update';
