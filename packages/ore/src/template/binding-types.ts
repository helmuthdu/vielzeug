/**
 * template/binding-types.ts — Pure type definitions for the template binding system.
 *
 * All bindings reference actual DOM nodes directly (no UID-based lookup), resolved
 * by path navigation on the cloned template (see compiler.ts / instantiator.ts).
 * Runtime factories and brand guards live in `result.ts` — this module is types only.
 */

import { type Readable } from '@vielzeug/ripple';

import { type PropMeta } from '../props';
import { type DirectiveResult, type HTMLResult, type Ref, type RefCallback } from './result';

// ─── Binding variants ─────────────────────────────────────────────────────────

type AttrBaseFields = {
  el: HTMLElement;
  /**
   * When true the binding uses live-write semantics: stale app-state writes are
   * skipped if the DOM value has diverged from the last programmatic write.
   * Set when the bound value came through `live()` (see directives/live.ts).
   */
  live?: true;
  mode: 'attr' | 'bool';
  name: string;
  /** Pre-resolved prop metadata (if the target element is an ore component). */
  propMeta?: PropMeta;
  type: 'attr';
};

/** Attribute binding with a static value (no signal). */
export type AttrStaticBinding = AttrBaseFields & { value: unknown };

/** Attribute binding driven by a reactive signal. */
export type AttrReactiveBinding = AttrBaseFields & { signal: Readable<unknown> };

export type AttrBinding = AttrStaticBinding | AttrReactiveBinding;

export type EventBinding = {
  el: HTMLElement;
  handler: (e: Event) => void;
  name: string;
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
  signal: Readable<HtmlBindingValue[]>;
  type: 'html';
};

export type DirectiveBinding = {
  anchor: Comment;
  directive: DirectiveResult;
  type: 'directive';
};

export type Binding = AttrBinding | EventBinding | RefBinding | HtmlBinding | DirectiveBinding;
