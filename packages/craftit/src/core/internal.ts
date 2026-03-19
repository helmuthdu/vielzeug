/**
 * @internal — Engine internals shared across template, each(), and custom directives.
 *
 * These are NOT part of the public API. Importing directly is an unstable contract.
 * Public-facing types (HTMLResult, Directive, Ref, RefCallback) are
 * re-exported from the main entry point.
 */

import { type ReadonlySignal, type Signal } from '@vielzeug/stateit';

// ─── Ref types (public, re-exported via craftit.ts barrel) ───────────────────
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

// ─── HTMLResult ───────────────────────────────────────────────────────────────
export type HTMLResult = {
  __bindings: Binding[];
  __html: string;
  toString(): string;
};

/**
 * Context provided to a directive's mount function.
 */
export interface DirectiveContext {
  /** The cleanup registration function for the component. */
  registerCleanup: (fn: () => void) => void;
}

/**
 * Unified interface for all directives — spread-position (mount) and
 * interpolation-position (render).
 */
export interface Directive {
  /** Invoked when the element is mounted in the DOM. */
  mount?(el: HTMLElement, context: DirectiveContext): void;
  /** Invoked by the template engine to render content (interpolation directives). */
  render?(): HTMLResult | string;
}

// ─── Binding types ────────────────────────────────────────────────────────────
export type TextBinding = { signal: ReadonlySignal<unknown>; type: 'text'; uid: string };
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

// ─── EACH_SIGNAL (opaque marker for each() reactive results) ─────────────────
/** @internal */
export const EACH_SIGNAL: unique symbol = Symbol('craftit.eachSignal');

// ─── Marker constants ─────────────────────────────────────────────────────────
/** @internal — binding element identifier attribute. */
export const CF_ID_ATTR = 'u';

// ─── Internal factory functions ───────────────────────────────────────────────
/** @internal — construct an HTMLResult from a pre-built html string and bindings. */
export function htmlResult(html: string, bindings: Binding[] = []): HTMLResult {
  return {
    __bindings: bindings,
    __html: html,
    toString() {
      return html;
    },
  };
}

/** @internal — extract html and bindings from a string or HTMLResult. */
export function extractResult(v: string | HTMLResult): { bindings: Binding[]; html: string } {
  return typeof v === 'string' ? { bindings: [], html: v } : { bindings: v.__bindings, html: v.__html };
}
