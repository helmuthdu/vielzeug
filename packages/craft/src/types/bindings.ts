/**
 * Core type definitions for the template binding and rendering system.
 *
 * All bindings reference actual DOM nodes directly (no UID-based lookup).
 * This eliminates the TreeWalker indexing pass and the string-based ID remapping
 * that the previous design required.
 */

import { type ReadonlySignal, signal, type Signal } from '@vielzeug/ripple';

// ─── REF TYPES ───────────────────────────────────────────────────────────────

export type Ref<T extends Element> = Signal<T | null>;

export function ref<T extends Element>(): Ref<T> {
  return signal<T | null>(null);
}

export type RefCallback<T extends Element> = (el: T | null) => void;

// ─── BINDING VARIANTS ────────────────────────────────────────────────────────
// All bindings hold direct references to the DOM node they manage.

export type TextBinding = {
  node: Text;
  signal: ReadonlySignal<unknown>;
  type: 'text';
};

/**
 * Minimal prop metadata needed by the attr binding layer.
 * Populated at binding creation time from propRegistry, so template-bindings.ts
 * has no direct dependency on props.ts.
 */
export type AttrPropMeta = {
  parse: (v: string | null) => unknown;
  reflect: boolean;
  signal: { value: unknown };
};

type AttrBaseFields = {
  el: HTMLElement;
  /**
   * When true the binding uses live-write semantics: stale app-state writes are
   * skipped if the DOM value has diverged from the last programmatic write.
   */
  live?: true;
  mode: 'attr' | 'bool';
  name: string;
  /** Pre-resolved prop metadata (if the target element is a craft component). */
  propMeta?: AttrPropMeta;
  type: 'attr';
};

/** Attribute binding with a static value (no signal). */
export type AttrStaticBinding = AttrBaseFields & { value: unknown };

/** Attribute binding driven by a reactive signal. */
export type AttrReactiveBinding = AttrBaseFields & { signal: ReadonlySignal<unknown> };

export type AttrBinding = AttrStaticBinding | AttrReactiveBinding;

export type EventBinding = {
  el: HTMLElement;
  handler: (e: Event) => void;
  name: string;
  options?: AddEventListenerOptions;
  type: 'event';
};

export type RefBinding = {
  el: HTMLElement;
  ref: Ref<Element> | RefCallback<Element>;
  type: 'ref';
};

/** Value types a reactive HTML slot can produce. */
export type HtmlBindingValue = HTMLResult | string | number | boolean | null | undefined;

export type HtmlBinding = {
  anchor: Comment;
  signal: ReadonlySignal<HtmlBindingValue | HtmlBindingValue[]>;
  type: 'html';
};

export type DirectiveBinding = {
  anchor: Comment;
  directive: RuntimeDirective;
  type: 'directive';
};

/** Element-spread binding applied by model() and similar helpers. */
export type SpreadBinding = {
  el: HTMLElement;
  spread: SpreadObject;
  type: 'spread';
};

export type Binding =
  | TextBinding
  | AttrBinding
  | EventBinding
  | RefBinding
  | HtmlBinding
  | DirectiveBinding
  | SpreadBinding;

// ─── RUNTIME DIRECTIVE ───────────────────────────────────────────────────────

export type RuntimeDirective = {
  mount: (anchor: Comment, registerCleanup: (fn: () => void) => void) => void;
};

export type DirectiveResult = RuntimeDirective;

const DIRECTIVE_BRAND: unique symbol = Symbol.for('craft:directive');

/**
 * Creates a registered DirectiveResult. All directive factories must use this
 * function — only objects created here pass `isDirectiveResult()`.
 */
export const createDirectiveResult = (mount: RuntimeDirective['mount']): DirectiveResult => {
  return { [DIRECTIVE_BRAND]: true, mount } as DirectiveResult;
};

export const isDirectiveResult = (value: unknown): value is DirectiveResult =>
  typeof value === 'object' && value !== null && DIRECTIVE_BRAND in (value as object);

// ─── SPREAD OBJECT ───────────────────────────────────────────────────────────
// Returned by model() and similar helpers that apply multiple bindings to one element.

export type SpreadObject = {
  apply(el: HTMLElement, registerCleanup: (fn: () => void) => void): void;
};

const SPREAD_BRAND: unique symbol = Symbol.for('craft:spread');

/**
 * Creates a registered SpreadObject. Used by model() to attach multiple bindings
 * (value sync + input event) to an element via a single template expression.
 */
export const createSpreadObject = (apply: SpreadObject['apply']): SpreadObject => {
  return { apply, [SPREAD_BRAND]: true } as SpreadObject;
};

export const isSpreadObject = (value: unknown): value is SpreadObject =>
  typeof value === 'object' && value !== null && SPREAD_BRAND in (value as object);

// ─── HTML RESULT ─────────────────────────────────────────────────────────────

const HTML_RESULT_BRAND: unique symbol = Symbol.for('craft:html-result');

/**
 * The output of an `html` tagged template call.
 *
 * Contains a pre-cloned `DocumentFragment` ready to insert and an `apply` method
 * that wires up all reactive effects to the fragment's nodes.
 *
 * Each `html` call produces an independent fragment — there is no shared mutable
 * state between instances, so the same template can be safely rendered multiple
 * times (e.g. inside `each()`).
 */
export interface HTMLResult {
  /** The DOM fragment ready to insert into the document. Consumed on insertion. */
  readonly fragment: DocumentFragment;
  /** Wire up reactive effects to the fragment's nodes. Call after insertion. */
  apply(registerCleanup: (fn: () => void) => void): void;
}

export const isHtmlResult = (value: unknown): value is HTMLResult =>
  typeof value === 'object' && value !== null && HTML_RESULT_BRAND in (value as object);

export function createHtmlResult(
  fragment: DocumentFragment,
  applyFn: (registerCleanup: (fn: () => void) => void) => void,
): HTMLResult {
  return { apply: applyFn, fragment, [HTML_RESULT_BRAND]: true } as HTMLResult;
}
