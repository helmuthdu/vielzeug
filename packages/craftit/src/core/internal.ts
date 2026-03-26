/**
 * @internal — Binding type system and engine internals.
 *
 * These types define the contract between the template compiler and binding engine.
 * They are NOT part of the public API and importing directly is an unstable contract.
 *
 * Public-facing types (HTMLResult, Directive, Ref, RefCallback, Refs) are
 * re-exported from the main entry point.
 */

import { type ReadonlySignal, type Signal } from '@vielzeug/stateit';

const HTML_RESULT_BRAND: unique symbol = Symbol('craftit.htmlResultBrand');

// ─────────────────────────────────────────────────────────────────────────────
// REF TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Ref<T extends Element> {
  value: T | null;
}

export function ref<T extends Element>(): Ref<T> {
  return { value: null };
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
