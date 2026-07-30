/**
 * The niche/advanced directives — everyday ones (`each`, `when`, `classMap`, `styleMap`,
 * `model`) live in the main `@vielzeug/ore` entry instead. `raw()` is security-sensitive
 * (renders trusted HTML unescaped) and `live()` is form-control-specific, so both stay behind
 * a deliberate, separate import.
 */
export { live, type LiveBinding } from './live';
export { raw, setRawSanitizer } from './raw';

/**
 * Authoring API for custom directives — building blocks `each()`/`when()`/`raw()`/`model()`
 * are themselves built on. Use `createDirectiveResult()` to write a directive that controls
 * DOM insertion directly (an `html\`...${myDirective(...)}...\`` slot), or
 * `createSpreadObject()` to write a `model()`-style helper that applies several bindings
 * (value sync, event listeners) to one element from a single template expression.
 *
 * Both factories stamp a runtime brand — a hand-built object matching `DirectiveResult`'s or
 * `SpreadObject`'s shape without going through these factories is *not* recognized by the
 * template engine and silently renders as stringified text instead. Always construct through
 * these functions, never build the object literal yourself.
 *
 * @example
 * ```ts
 * import { createDirectiveResult, type DirectiveResult } from '@vielzeug/ore/directives';
 *
 * function fadeIn(): DirectiveResult {
 *   return createDirectiveResult((anchor, registerCleanup) => {
 *     const el = document.createElement('div');
 *     el.textContent = 'Hello';
 *     anchor.parentNode?.insertBefore(el, anchor);
 *     registerCleanup(() => el.remove());
 *   });
 * }
 * ```
 */
export { createDirectiveResult, createSpreadObject, isDirectiveResult, isSpreadObject } from '../template/result';
export type { DirectiveResult, SpreadObject } from '../template/result';
