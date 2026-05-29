/**
 * Core type definitions for the template binding and rendering system.
 *
 * - Binding variants: how the runtime patches specific DOM targets
 * - HTMLResult: the output of the `html` tagged template
 * - DirectiveResult: a mountable directive (e.g. each())
 * - Ref utilities: signal-based element references
 */

import { signal, type Signal } from '@vielzeug/ripple';

// ─────────────────────────────────────────────────────────────────────────────
// REF TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type Ref<T extends Element> = Signal<T | null>;

export function ref<T extends Element>(): Ref<T> {
  return signal<T | null>(null);
}

export type Refs<T extends Element> = T[];

export function refs<T extends Element>(): Refs<T> {
  return [];
}

export type RefCallback<T extends Element> = (el: T | null) => void;

// ─────────────────────────────────────────────────────────────────────────────
// BINDING VARIANT TYPES
// ─────────────────────────────────────────────────────────────────────────────

import type { ReadonlySignal } from '@vielzeug/ripple';

export type TextBinding = {
  signal: ReadonlySignal<unknown>;
  type: 'text';
  uid: string;
};

export type AttrBinding = {
  /** When true the binding uses live-write semantics: stale app-state writes are
   * skipped if the DOM value has diverged from the last programmatic write. */
  live?: true;
  mode: 'bool' | 'attr';
  name: string;
  signal?: ReadonlySignal<unknown>;
  type: 'attr';
  uid: string;
  value?: unknown;
};

export type EventBinding = {
  handler: (e: Event) => void;
  name: string;
  options?: AddEventListenerOptions;
  type: 'event';
  uid: string;
};

export type RefBinding = {
  ref: Ref<Element> | Refs<Element> | RefCallback<Element>;
  type: 'ref';
  uid: string;
};

export type HtmlBindingPayload = {
  bindings: Binding[];
  html: string;
};

export type RuntimeDirective = {
  mount: (anchor: Comment, registerCleanup: (fn: () => void) => void) => void;
};

export type DirectiveResult = RuntimeDirective;

const directiveBrand = new WeakSet<object>();

/**
 * Creates a registered DirectiveResult. All directive factories must use this
 * function — only objects created here pass `isDirectiveResult()`.
 */
export const createDirectiveResult = (mount: RuntimeDirective['mount']): DirectiveResult => {
  const directive: RuntimeDirective = { mount };

  directiveBrand.add(directive);

  return directive;
};

export const isDirectiveResult = (value: unknown): value is DirectiveResult =>
  typeof value === 'object' && value !== null && directiveBrand.has(value as object);

export type HtmlBinding = {
  signal: ReadonlySignal<HtmlBindingPayload>;
  type: 'html';
  uid: string;
};

export type DirectiveBinding = {
  directive: RuntimeDirective;
  type: 'directive';
  uid: string;
};

export type Binding = TextBinding | AttrBinding | EventBinding | RefBinding | HtmlBinding | DirectiveBinding;

// ─────────────────────────────────────────────────────────────────────────────
// HTML RESULT
// ─────────────────────────────────────────────────────────────────────────────

export interface HTMLResult {
  readonly bindings: Binding[];
  readonly html: string;
  toString(): string;
}

const htmlResultBrand = new WeakSet<object>();

/**
 * Creates a registered HTMLResult. Only objects created here pass `isHtmlResult()`.
 * Using a WeakSet brand prevents forgery by objects with matching shape.
 */
export function htmlResult(html: string, bindings: Binding[] = []): HTMLResult {
  const result: HTMLResult = {
    bindings,
    html,
    toString() {
      return html;
    },
  };

  htmlResultBrand.add(result);

  return result;
}

export const isHtmlResult = (value: unknown): value is HTMLResult =>
  typeof value === 'object' && value !== null && htmlResultBrand.has(value as object);

export function extractResult(v: string | HTMLResult): { bindings: Binding[]; html: string } {
  return typeof v === 'string' ? { bindings: [], html: v } : { bindings: v.bindings, html: v.html };
}
