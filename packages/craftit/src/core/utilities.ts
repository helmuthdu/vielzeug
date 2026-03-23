/**
 * Utilities — DOM helpers, ID generation, event handling, CSS compilation, and emit functions.
 *
 * This module consolidates:
 * - DOM and string utilities (setAttr, listen, createId, createFormIds, guard, escapeHtml, toKebab)
 * - ID generation and form field ID helpers
 * - Emitter for type-safe custom events
 * - CSS template tag and stylesheet caching
 * - Style loader for adoptedStyleSheets
 */

import { currentRuntime, fire } from './runtime-lifecycle';

// ─────────────────────────────────────────────────────────────────────────────
// COMMON DOM & STRING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

// ─── Counter singletons ───────────────────────────────────────────────────────
let _idCounter = 0;

/** @internal — resets the ID counter. Used by _resetCounters in test/test.ts. */
export const _resetIdCounter = (): void => {
  _idCounter = 0;
};

// ─── Shared DOM/string utilities ──────────────────────────────────────────────
/** Iterate an iterable and call every function in it. */
export const runAll = (fns: Iterable<() => void>): void => {
  for (const fn of fns) fn();
};

export const setAttr = (el: Element, name: string, val: unknown): void => {
  if (val == null || val === false) {
    el.removeAttribute(name);
  } else if (val === true) {
    el.setAttribute(name, '');
  } else {
    el.setAttribute(name, String(val));
  }
};

export const listen = (
  el: EventTarget,
  name: string,
  handler: (e: any) => void,
  options?: AddEventListenerOptions,
): (() => void) => {
  const listener: EventListener = handler as EventListener;

  el.addEventListener(name, listener, options);

  return () => el.removeEventListener(name, listener, options);
};

/**
 * Creates a unique, stable ID string — suitable for `aria-labelledby`, `aria-describedby`,
 * and similar accessibility linkages. Call once per component instance (at setup time or inside `onMount`).
 */
export const createId = (prefix?: string): string => `${prefix ? `${prefix}-` : 'cft-'}${++_idCounter}`;

/**
 * Generates a stable set of ARIA-related IDs for a form control.
 * Snapshot `name` at call time — IDs are stable strings, not reactive.
 * `name` must be a non-empty string — callers that need a generated ID should
 * pass `createId(prefix)` as the name argument.
 *
 * @example
 * const { fieldId, labelId, helperId, errorId } = createFormIds('input', props.name.value);
 */
export const createFormIds = (prefix: string, name?: string | null) => {
  const normalizedName = name && name.trim() ? name : createId(prefix);
  const fieldId = `${prefix}-${normalizedName}`;

  return {
    errorId: `error-${fieldId}`,
    fieldId,
    helperId: `helper-${fieldId}`,
    labelId: `label-${fieldId}`,
  };
};

/**
 * Wraps an event handler with a guard condition. The handler is only invoked when `condition()` returns `true`.
 * Use for disabled checks, readonly guards, or any runtime condition.
 *
 * @example
 * const handleClick = guard(() => !props.disabled.value, (e) => toggle(e));
 */
export const guard =
  <E extends Event = Event>(condition: () => unknown, handler: (e: E) => void): ((e: E) => void) =>
  (e) => {
    if (condition()) handler(e);
  };

export const toKebab = (str: string): string => str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const _ESC: Record<string, string> = { "'": '&#39;', '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' };

/**
 * Escapes HTML entity characters (`&`, `<`, `>`, `"`, `'`) in a value.
 * **Safe only in HTML text/attribute contexts.** Do NOT use for CSS values,
 * `javascript:` URLs, event handler attributes, or inline `<script>` content.
 */
export const escapeHtml = (value: unknown): string => String(value).replace(/[&<>"']/g, (c) => _ESC[c]);

// ─────────────────────────────────────────────────────────────────────────────
// EMIT FUNCTION (TYPE-SAFE CUSTOM EVENTS)
// ─────────────────────────────────────────────────────────────────────────────

type NoDetail = void | undefined | never;
type KeysWithoutDetail<T extends Record<string, unknown>> = {
  [P in keyof T]: [T[P]] extends [NoDetail] ? P : never;
}[keyof T];

export type EmitFn<T extends Record<string, unknown>> = {
  <K extends KeysWithoutDetail<T>>(event: K): void;
  <K extends Exclude<keyof T, KeysWithoutDetail<T>>>(event: K, detail: T[K]): void;
};

export const createEmitFn = <T extends Record<string, unknown>>(): EmitFn<T> => {
  const el = currentRuntime().el;

  return ((event: keyof T, ...rest: unknown[]) => {
    fire.custom(el, String(event), rest.length > 0 ? { detail: rest[0] } : undefined);
  }) as EmitFn<T>;
};

// ─────────────────────────────────────────────────────────────────────────────
// CSS & STYLESHEET UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export type CSSResult = {
  content: string;
  toString(): string;
};

const cssResultToString = function (this: CSSResult): string {
  return this.content;
};

export const css = (strings: TemplateStringsArray, ...values: unknown[]): CSSResult => {
  let content = '';

  for (let i = 0; i < strings.length; i++) {
    content += strings[i];

    if (i < values.length) {
      const v = values[i];

      content += v && typeof v === 'object' && 'content' in v ? (v as CSSResult).content : (v ?? '');
    }
  }

  return { content: content.trim(), toString: cssResultToString };
};

const stylesheetStringCache = new Map<string, CSSStyleSheet>();

export const loadStylesheet = (style: string | CSSStyleSheet | CSSResult): CSSStyleSheet => {
  if (style instanceof CSSStyleSheet) return style;

  const cssText = typeof style === 'string' ? style : style.content;
  const cached = stylesheetStringCache.get(cssText);

  if (cached) return cached;

  const sheet = new CSSStyleSheet();

  try {
    sheet.replaceSync(cssText);
    stylesheetStringCache.set(cssText, sheet);
  } catch (err) {
    console.error(`[craftit:E2] style replace failed`, err);
  }

  return sheet;
};
