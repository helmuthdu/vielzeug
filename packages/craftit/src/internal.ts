/**
 * @internal — Engine internals shared across template, each(), and custom directives.
 * These are NOT part of the public craftit API; importing directly is an unstable contract.
 * Public-facing types (HTMLResult, DirectiveDescriptor, Ref, RefCallback) are re-exported
 * from the main @vielzeug/craftit entry point.
 */

import { computed, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

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
 * Unified interface for all directives.
 */
export interface Directive {
  /** Invoked when the element is mounted in the DOM. */
  mount?(el: HTMLElement, context: DirectiveContext): void;
  /** Invoked by the template engine to render content (interpolation directives). */
  render?(): HTMLResult | string;
}

// ─── DirectiveDescriptor (public, re-exported via craftit.ts barrel) ─────────
/**
 * Descriptor returned by any spread-position directive (e.g. `bind()`).
 */
export type DirectiveDescriptor = Directive;

// ─── Binding types ────────────────────────────────────────────────────────────
export type TextBinding = { signal: ReadonlySignal<unknown>; type: 'text'; uid: string };
export type AttrBindingBase = {
  name: string;
  signal?: ReadonlySignal<unknown>;
  uid: string;
  value?: unknown;
};
export type AttrBinding = AttrBindingBase & {
  mode: 'bool' | 'attr';
  type: 'attr';
};
export type PropBindingBase = {
  /** Optional writable source used for native two-way bridge (.value/.checked). */
  model?: Signal<unknown>;
  name: string;
  signal?: ReadonlySignal<unknown>;
  uid: string;
  value?: unknown;
};
export type PropBinding = PropBindingBase & {
  type: 'prop';
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
/** @internal */
export type EachResult =
  | HTMLResult
  | {
      [EACH_SIGNAL]: ReadonlySignal<{
        bindings: Binding[];
        html: string;
        items?: Array<{ bindings: Binding[]; html: string }>;
        keys?: (string | number)[];
      }>;
    };

// ─── Marker constants ────────────────────────────────────────────────────────
/** @internal — single attribute used for all element-level bindings. */
export const CF_ID_ATTR = 'u';

// ─── Marker regex ─────────────────────────────────────────────────────────────
/**
 * @internal — regex that matches any marker string embedded in craftit-generated HTML.
 * Used by `each()` when renumbering markers across list items.
 */
export const MARKER_PATTERN = /u="\d+"|__h_\d+|__s_\d+/g;

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

/**
 * @internal — Returns `computed(build)` when `hasReactive` is true, otherwise calls `build()` directly.
 * Shared by `classes()` and `style()` to avoid duplicating the static/reactive dispatch.
 */
export function computedOrStatic<T>(hasReactive: boolean, build: () => T): T | ReadonlySignal<T> {
  return hasReactive ? computed(build) : build();
}
