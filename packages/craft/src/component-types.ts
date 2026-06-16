/**
 * Public component definition types for craft web components.
 * These are the types consumers interact with when calling define().
 */

import type { CleanupFn, EffectCallback, ReadonlySignal } from '@vielzeug/ripple';

import type { AriaConfig } from './aria';
import type { InjectionKey } from './context';
import type { CraftError } from './errors';
import type { HostBindConfig, HostBindingValue } from './host-bind';
import type { InferProps, PropsDef } from './props';
import type { OnMountedCallback } from './runtime';
import type { ComponentSlots } from './slots';
import type { HTMLResult } from './types/bindings';
import type { CSSResult } from './utils/css';
import type { EmitFn } from './utils/emit';

/**
 * The context bag passed as the second argument to `setup()`.
 * Contains everything you need to build a component — bindings, lifecycle hooks,
 * context injection, and slot signals — all in one place.
 */
export type SetupContextBag<
  Emits extends Record<string, unknown> = Record<string, never>,
  SlotNames extends string = string,
> = {
  /**
   * Reactively sync ARIA attributes on any element, auto-cleanup on component disconnect.
   * Returns a cleanup function that removes all reactive ARIA bindings.
   */
  aria: (target: Element, config: AriaConfig) => () => void;
  /**
   * Shorthand for applying a single reactive or static attribute to the host element.
   * Equivalent to `bind({ attr: { [name]: value } })`.
   */
  attr: (name: string, value: HostBindingValue) => () => void;
  /** Apply reactive or static bindings to the host element's attributes, classes, styles, and events. */
  bind: (config: HostBindConfig, options?: AddEventListenerOptions) => () => void;
  /** The component's host element. */
  el: HTMLElement;
  /** Dispatch a typed custom event from the host element. */
  emit: EmitFn<Emits>;
  /**
   * Resolve an injected context value from a providing ancestor.
   * Walks the DOM tree (including shadow boundaries) to find the nearest
   * element that called `ctx.provide()` with the given key.
   */
  inject: {
    <T>(key: InjectionKey<T>): T | undefined;
    <T>(key: InjectionKey<T>, fallback: T): T;
  };
  /**
   * Register a cleanup function to run on component disconnect.
   * All registered functions run when the element leaves the DOM.
   */
  onCleanup: (fn: CleanupFn) => void;
  /**
   * Watch a ref signal and run a callback when it resolves to a non-null element.
   * The callback's return value is used as a cleanup function.
   */
  onElement: <T extends HTMLElement>(
    ref: ReadonlySignal<T | null>,
    callback: (el: T) => CleanupFn | undefined | void,
  ) => () => void;
  /**
   * Attach a scoped event listener that is automatically removed on component disconnect.
   * Silently no-ops when `target` is `null` or `undefined`.
   */
  onEvent: {
    <K extends keyof HTMLElementEventMap>(
      target: EventTarget | null | undefined,
      event: K,
      listener: (e: HTMLElementEventMap[K]) => void,
      options?: AddEventListenerOptions,
    ): void;
    (
      target: EventTarget | null | undefined,
      event: string,
      listener: EventListener,
      options?: AddEventListenerOptions,
    ): void;
  };
  /**
   * Register work to run after the component template mounts to the DOM.
   * Multiple callbacks run in registration order.
   */
  onMounted: (fn: OnMountedCallback) => void;
  /**
   * Register a context value on the host element, making it available to
   * descendant components via `ctx.inject(key)`.
   */
  provide: <T>(key: InjectionKey<T>, value: T) => void;
  /** Reactive slot presence / element signals. */
  slots: ComponentSlots<SlotNames>;
  /**
   * Create a reactive effect scoped to the component lifecycle.
   * Automatically cleaned up on component disconnect.
   * Returns a stop function that disposes the effect immediately.
   */
  watch: (fn: EffectCallback) => () => void;
};

export type ComponentDefinition<
  Props extends Record<string, unknown> = Record<never, never>,
  Emits extends Record<string, unknown> = Record<string, never>,
  SlotNames extends string = string,
> = {
  formAssociated?: boolean;
  /**
   * Rendered while async `setup()` is still pending.
   * Only used when `setup` returns a `Promise`.
   */
  loading?: () => HTMLResult;
  /**
   * Error handler called when setup throws.
   * If a recovery HTMLResult is returned, it replaces the failed template.
   */
  onError?: (error: CraftError, element: HTMLElement) => HTMLResult | void;
  props?: PropsDef<Props>;
  setup: (
    props: InferProps<PropsDef<Props>>,
    ctx: SetupContextBag<Emits, SlotNames>,
  ) => HTMLResult | null | Promise<HTMLResult | null>;
  /**
   * Shadow DOM configuration. `mode` defaults to `'open'`.
   * Set to `false` to opt out of shadow DOM entirely (light DOM rendering).
   */
  shadow?: Partial<ShadowRootInit> | false;
  styles?: (string | CSSStyleSheet | CSSResult)[];
};
