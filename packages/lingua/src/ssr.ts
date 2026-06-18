/**
 * /lingua/ssr
 *
 * Server-side rendering helpers for @vielzeug/lingua. Import from `@vielzeug/lingua/ssr`.
 * Do NOT import in browser-only bundles — keep this entry out of your client bundle.
 *
 * @example
 * ```ts
 * import { serializeI18n, hydrateI18n } from '@vielzeug/lingua/ssr';
 *
 * // Server:
 * const state = serializeI18n(i18n);
 * res.send(`<script>window.__I18N__=${JSON.stringify(state)}</script>`);
 *
 * // Client:
 * hydrateI18n(i18n, window.__I18N__);
 * ```
 */

export { type I18nState, hydrateI18n, serializeI18n } from './i18n';
