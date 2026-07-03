/**
 * @vielzeug/prism — debug utilities for chart visualisation.
 *
 * Import from the dedicated sub-path so debug code is tree-shaken from
 * production bundles:
 * ```ts
 * import { } from '@vielzeug/prism/devtools';
 * ```
 *
 * Internal validation warnings (misuse of the public API) are emitted
 * automatically in development builds and live in the private `src/_dev.ts`
 * module. They are not part of this sub-path.
 */
