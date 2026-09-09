/**
 * Parser internals subpath export.
 *
 * These functions and types are not exported from the root entry point. Import
 * them from `@vielzeug/keymap/parse` when building custom tooling, validators,
 * or framework integrations that need direct access to the shortcut parser.
 *
 * @example
 * import { parseShortcut, parseStep, matchStep, canonicalizeShortcut, detectModKey } from '@vielzeug/keymap/parse';
 */
export type { ModifierKey, Shortcut, ShortcutStep } from './parser';
export { canonicalizeShortcut, detectModKey, matchStep, parseShortcut, parseStep } from './parser';
