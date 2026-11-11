/**
 * template/result.ts: Branded result objects produced by the template authoring APIs.
 *
 * Runtime code (factories, brand guards) lives here next to the template engine that
 * consumes it; pure binding-shape types live in `binding-types.ts`. All branding goes
 * through `utils/brand.ts` (`Symbol.for`): see that module for why.
 */

import { type Signal, signal } from '@vielzeug/ripple';

import { ORE_ERRORS, OreApiError } from '../errors';
import { makeBrand } from '../utils/brand';

// ─── Refs ─────────────────────────────────────────────────────────────────────

export type Ref<T extends Element> = Signal<T | null>;

export function ref<T extends Element>(): Ref<T> {
  return signal<T | null>(null);
}

export type RefCallback<T extends Element> = (el: T | null) => void;

// ─── Directive result ─────────────────────────────────────────────────────────

export type DirectiveResult = {
  mount: (anchor: Comment) => void;
};

const directiveBrand = makeBrand<DirectiveResult>('ore:directive');

/**
 * Creates a registered DirectiveResult. All directive factories must use this
 * function: only objects created here pass `isDirectiveResult()`.
 */
export const createDirectiveResult = (mount: DirectiveResult['mount']): DirectiveResult =>
  directiveBrand.stamp({ mount });

export const isDirectiveResult = directiveBrand.is;

// ─── HTML result ──────────────────────────────────────────────────────────────

declare const htmlResultTag: unique symbol;

/**
 * The output of an `html` tagged template call: an opaque, single-use value.
 *
 * Each `html` call produces an independent fragment bound to its own interpolated
 * values, so it can be rendered exactly once: return it from `setup()`, interpolate
 * it into another template, or return it from a directive callback. Rendering the
 * same result twice throws; call the template function again for a second copy.
 */
export interface HTMLResult {
  readonly [htmlResultTag]: true;
}

/**
 * @internal The engine-facing shape behind every `HTMLResult`. `fragment` and `apply`
 * are the two-phase insertion protocol (static-embed merging in the instantiator,
 * `insertHtmlValues` in the binding layer); `mount` does both in one step. Every
 * consumer calls `claim()` first, which enforces single use.
 */
export interface CompiledHTMLResult extends HTMLResult {
  /** Wire up reactive effects to the fragment's nodes. Call after insertion. */
  apply(): void;
  /** Mark this result as consumed; throws `OreApiError` when it already was. */
  claim(): void;
  /** The DOM fragment ready to insert into the document. Consumed on insertion. */
  readonly fragment: DocumentFragment;
  /**
   * Claim, insert the template's nodes before `anchor` (or append to `parent` when
   * `anchor` is null), and wire up all reactive effects. Returns the inserted nodes.
   * Listeners and nested effects register themselves on the active ripple owner.
   */
  mount(parent: ParentNode, anchor: Node | null): Node[];
}

const htmlResultBrand = makeBrand<CompiledHTMLResult>('ore:html-result');

export const isHtmlResult = htmlResultBrand.is;

/** @internal Narrow a public `HTMLResult` to the engine shape, rejecting anything else. */
export const asCompiled = (result: HTMLResult): CompiledHTMLResult => {
  if (!isHtmlResult(result)) throw new OreApiError(ORE_ERRORS.notAnHtmlResult);

  return result;
};

export function createHtmlResult(fragment: DocumentFragment, applyFn: () => void): CompiledHTMLResult {
  let claimed = false;

  const claim = (): void => {
    if (claimed) throw new OreApiError(ORE_ERRORS.htmlResultReused);

    claimed = true;
  };

  const mount = (parent: ParentNode, anchor: Node | null): Node[] => {
    claim();

    const nodes = Array.from(fragment.childNodes);

    parent.insertBefore(fragment, anchor);
    applyFn();

    return nodes;
  };

  return htmlResultBrand.stamp({ apply: applyFn, claim, fragment, mount } as unknown as CompiledHTMLResult);
}
