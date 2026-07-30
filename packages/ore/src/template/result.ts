/**
 * template/result.ts — Branded result objects produced by the template authoring APIs.
 *
 * Runtime code (factories, brand guards) lives here next to the template engine that
 * consumes it; pure binding-shape types live in `binding-types.ts`. All branding goes
 * through `utils/brand.ts` (`Symbol.for`) — see that module for why.
 */

import { signal, type Signal } from '@vielzeug/ripple';

import { makeBrand } from '../utils/brand';

// ─── Refs ─────────────────────────────────────────────────────────────────────

export type Ref<T extends Element> = Signal<T | null>;

export function ref<T extends Element>(): Ref<T> {
  return signal<T | null>(null);
}

export type RefCallback<T extends Element> = (el: T | null) => void;

// ─── Directive result ─────────────────────────────────────────────────────────

export type DirectiveResult = {
  mount: (anchor: Comment, registerCleanup: (fn: () => void) => void) => void;
};

const directiveBrand = makeBrand<DirectiveResult>('ore:directive');

/**
 * Creates a registered DirectiveResult. All directive factories must use this
 * function — only objects created here pass `isDirectiveResult()`.
 */
export const createDirectiveResult = (mount: DirectiveResult['mount']): DirectiveResult =>
  directiveBrand.stamp({ mount });

export const isDirectiveResult = directiveBrand.is;

// ─── Spread object ────────────────────────────────────────────────────────────
// Returned by model() and similar helpers that apply multiple bindings to one element.

export type SpreadObject = {
  apply(el: HTMLElement, registerCleanup: (fn: () => void) => void): void;
};

const spreadBrand = makeBrand<SpreadObject>('ore:spread');

/**
 * Creates a registered SpreadObject. Used by model() to attach multiple bindings
 * (value sync + input event) to an element via a single template expression.
 */
export const createSpreadObject = (apply: SpreadObject['apply']): SpreadObject => spreadBrand.stamp({ apply });

export const isSpreadObject = spreadBrand.is;

// ─── HTML result ──────────────────────────────────────────────────────────────

/**
 * The output of an `html` tagged template call.
 *
 * Each `html` call produces an independent fragment — there is no shared mutable
 * state between instances, so the same template can be safely rendered multiple
 * times (e.g. inside `each()`).
 *
 * `mount()` is the entire public surface: insertion and reactive wiring in one
 * step, so the two can never get out of sync (the old public `fragment` + `apply`
 * pair made it possible to insert without wiring, or wire without inserting).
 */
export interface HTMLResult {
  /**
   * Insert the template's nodes before `anchor` (or append to `parent` when
   * `anchor` is null) and wire up all reactive effects. Returns the inserted
   * nodes so callers can remove them later.
   */
  mount(parent: ParentNode, anchor: Node | null, registerCleanup: (fn: () => void) => void): Node[];
}

/**
 * @internal The full result the template engine itself works with. `fragment` and
 * `apply` are the engine's own two-phase insertion protocol (static-embed merging in
 * the instantiator, `insertHtmlValues` in the binding layer) — not part of the
 * public API. Consumers only ever see `HTMLResult`.
 */
export interface CompiledHTMLResult extends HTMLResult {
  /** The DOM fragment ready to insert into the document. Consumed on insertion. */
  readonly fragment: DocumentFragment;
  /** Wire up reactive effects to the fragment's nodes. Call after insertion. */
  apply(registerCleanup: (fn: () => void) => void): void;
}

const htmlResultBrand = makeBrand<CompiledHTMLResult>('ore:html-result');

export const isHtmlResult = htmlResultBrand.is;

export function createHtmlResult(
  fragment: DocumentFragment,
  applyFn: (registerCleanup: (fn: () => void) => void) => void,
): CompiledHTMLResult {
  const mount = (parent: ParentNode, anchor: Node | null, registerCleanup: (fn: () => void) => void): Node[] => {
    const nodes = Array.from(fragment.childNodes);

    parent.insertBefore(fragment, anchor);
    applyFn(registerCleanup);

    return nodes;
  };

  return htmlResultBrand.stamp({ apply: applyFn, fragment, mount });
}
