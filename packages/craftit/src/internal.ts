/**
 * @internal — Binding type system, compiler/runtime helpers, and engine internals.
 *
 * These types and helpers define the contract between the template compiler, binding engine,
 * and component runtime.
 * They are NOT part of the public API and importing directly is an unstable contract.
 *
 * Selected author-facing exports (such as css(), CSSResult, EmitFn, HTMLResult, Directive,
 * ref(), and refs()) are re-exported from the main entry point.
 */

import { signal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import { fire } from './runtime';
import { currentRuntime } from './runtime-core';

const HTML_RESULT_BRAND: unique symbol = Symbol('craftit.htmlResultBrand');

let _idCounter = 0;

/** @internal — resets the ID counter. Used by _resetCounters in test/test.ts. */
export const _resetIdCounter = (): void => {
  _idCounter = 0;
};

/**
 * Creates a unique, stable ID string — suitable for `aria-labelledby`, `aria-describedby`,
 * and similar accessibility linkages. Call once per component instance (at setup time or inside `onMount`).
 */
export const createId = (prefix?: string): string => `${prefix ? `${prefix}-` : 'cft-'}${++_idCounter}`;

// ─────────────────────────────────────────────────────────────────────────────
// REF TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A reactive reference to a DOM element.
 *
 * Backed by a Signal — reactivity is built-in. Use with onElement()
 * for first-class element lifecycle management.
 *
 * @example
 * const inputRef = ref<HTMLInputElement>();
 *
 * onElement(inputRef, (input) => {
 *   input.focus();
 *   return () => { };  // cleanup
 * });
 *
 * // In template
 * <input ref=${inputRef} />
 */
export type Ref<T extends Element> = Signal<T | null>;

/**
 * Create a reactive element reference.
 *
 * Returns a Signal that tracks the mounted/unmounted state of a DOM element.
 * Automatically reactive — use directly in effects or with onElement().
 *
 * @see onElement for element lifecycle integration
 *
 * @example
 * const ref = ref<HTMLInputElement>();
 * // Type: Signal<HTMLInputElement | null>
 * // Automatically updates when element mounts/unmounts
 */
export function ref<T extends Element>(): Ref<T> {
  return signal<T | null>(null);
}

export type Refs<T extends Element> = T[];

export function refs<T extends Element>(): Refs<T> {
  return [];
}

export type RefCallback<T extends Element> = (el: T | null) => void;

// ─────────────────────────────────────────────────────────────────────────────
// HTML RESULT
// ─────────────────────────────────────────────────────────────────────────────

export interface HTMLResult {
  __bindings: Binding[];
  __html: string;
  toString(): string;
}

/** @internal — construct an HTMLResult from a pre-built html string and bindings. */
export function htmlResult(html: string, bindings: Binding[] = []): HTMLResult {
  const result = {
    __bindings: bindings,
    __html: html,
    toString() {
      return html;
    },
  };

  Object.defineProperty(result, HTML_RESULT_BRAND, {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false,
  });

  return result as HTMLResult;
}

/** @internal — strict HTMLResult runtime type guard. */
export const isHtmlResult = (value: unknown): value is HTMLResult =>
  typeof value === 'object' && !!value && (value as Record<symbol, unknown>)[HTML_RESULT_BRAND] === true;

/** @internal — extract html and bindings from a string or HTMLResult. */
export function extractResult(v: string | HTMLResult): { bindings: Binding[]; html: string } {
  return typeof v === 'string' ? { bindings: [], html: v } : { bindings: v.__bindings, html: v.__html };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIRECTIVES
// ─────────────────────────────────────────────────────────────────────────────

export interface DirectiveContext {
  /** The cleanup registration function for the component. */
  registerCleanup: (fn: () => void) => void;
}

export interface Directive {
  /** Invoked when the element is mounted in the DOM. */
  mount?(el: HTMLElement, context: DirectiveContext): void;
  /** Invoked by the template engine to render content (interpolation directives). */
  render?(): HTMLResult | string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BINDING TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type TextBinding = {
  signal: ReadonlySignal<unknown>;
  type: 'text';
  uid: string;
};

export type AttrBinding = {
  mode: 'bool' | 'attr';
  name: string;
  signal?: ReadonlySignal<unknown>;
  type: 'attr';
  uid: string;
  value?: unknown;
};

export type PropBinding = {
  /** Optional writable source used for native two-way bridge (.value/.checked). */
  model?: Signal<unknown>;
  name: string;
  signal?: ReadonlySignal<unknown>;
  type: 'prop';
  uid: string;
  value?: unknown;
};

export type EventBinding = {
  handler: (e: Event) => void;
  modifiers?: {
    capture?: boolean;
    once?: boolean;
    passive?: boolean;
    prevent?: boolean;
    self?: boolean;
    stop?: boolean;
  };
  name: string;
  type: 'event';
  uid: string;
};

export type RefBinding = {
  ref: Ref<Element> | Refs<Element> | RefCallback<Element>;
  type: 'ref';
  uid: string;
};

export type CallbackBinding = {
  apply: (el: HTMLElement, registerCleanup: (fn: () => void) => void) => void;
  type: 'callback';
  uid: string;
};

export type HtmlBinding = {
  keyed?: boolean;
  signal: ReadonlySignal<{
    bindings: Binding[];
    html: string;
    items?: Array<{ bindings: Binding[]; html: string }>;
    keys?: (string | number)[];
  }>;
  type: 'html';
  uid: string;
};

export type Binding =
  | TextBinding
  | AttrBinding
  | PropBinding
  | EventBinding
  | RefBinding
  | CallbackBinding
  | HtmlBinding;

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL MARKERS & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** @internal — opaque marker for each() reactive results. */
export const EACH_SIGNAL: unique symbol = Symbol('craftit.eachSignal');

/** @internal — binding element identifier attribute. */
export const CF_ID_ATTR = 'u';

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL DOM & EVENT UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/** @internal — Iterate an iterable and call every function in it. */
export const runAll = (fns: Iterable<() => void>): void => {
  const callbacks = [...fns];

  for (let index = callbacks.length - 1; index >= 0; index--) {
    callbacks[index]?.();
  }
};

/** @internal — Set an attribute on an element, handling boolean and null values. */
export const setAttr = (el: Element, name: string, val: unknown): void => {
  // Avoid inline event-handler attributes (onclick, onerror, ...) to reduce injection risk.
  if (/^on/i.test(name)) {
    el.removeAttribute(name);

    return;
  }

  if (val == null || val === false) {
    el.removeAttribute(name);
  } else if (val === true) {
    el.setAttribute(name, name.startsWith('aria-') ? 'true' : '');
  } else {
    el.setAttribute(name, String(val));
  }
};

/** @internal — Attach an event listener with automatic cleanup. */
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

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL STRING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export const toKebab = (str: string): string => str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const ESC: Record<string, string> = { "'": '&#39;', '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' };

/** @internal — Escape untrusted text for HTML text/attribute contexts. */
export const escapeHtml = (value: unknown): string => String(value).replace(/[&<>"']/g, (c) => ESC[c]);

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL EMIT TYPES & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

type NoDetail = void | undefined | never;
type KeysWithoutDetail<T extends Record<string, unknown>> = {
  [P in keyof T]: [T[P]] extends [NoDetail] ? P : never;
}[keyof T];

export type EmitFn<T extends Record<string, unknown>> = {
  <K extends KeysWithoutDetail<T>>(event: K): void;
  <K extends Exclude<keyof T, KeysWithoutDetail<T>>>(event: K, detail: T[K]): void;
};

/** @internal — Create a type-safe custom event emitter for the current runtime host. */
export const createEmitFn = <T extends Record<string, unknown>>(): EmitFn<T> => {
  const el = currentRuntime().el;

  return ((event: keyof T, ...rest: unknown[]) => {
    fire.custom(el, String(event), rest.length > 0 ? { detail: rest[0] } : undefined);
  }) as EmitFn<T>;
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL CSS & STYLESHEET UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export type CSSResult = {
  content: string;
  toString(): string;
};

const cssResultToString = function (this: CSSResult): string {
  return this.content;
};

/** @internal — Compile CSS template strings into a CSSResult. */
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

/** @internal — Load a stylesheet string or CSSResult into an adoptedStyleSheet. */
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
