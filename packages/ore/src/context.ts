/**
 * Component context injection API — `inject` / `injectStrict` / `provide` / `createContext`.
 *
 * Context values are stored on the providing element via a WeakMap registry and
 * resolved by walking up the DOM tree (including through shadow boundaries).
 * Providing is done via `provide(key, value)` inside `setup()`.
 *
 * Keys are `Symbol.for`-based (see `createContext`) so provide/inject still match
 * across a duplicated module graph — the same cross-copy survival rule as the
 * object brands in `utils/brand.ts`.
 */

import { warn } from './_dev';
import { OreApiError, ORE_ERRORS } from './errors';
import { requireSetupContext, type RuntimeContext } from './runtime';

const contextRegistry = new WeakMap<HTMLElement, Map<InjectionKey<unknown>, unknown>>();

export type InjectionKey<T> = symbol & {
  readonly __ore_injection_key?: T;
};

/**
 * Build a linear ancestor chain (including shadow host boundaries).
 * Walks `parentNode` (not `parentElement`) so non-HTML intermediate parents
 * (e.g. an `SVGElement` between child and provider) don't break the chain.
 */
const buildAncestorChain = (start: HTMLElement): HTMLElement[] => {
  const chain: HTMLElement[] = [];
  let node: Node | null = start;

  while (node) {
    if (node instanceof HTMLElement) chain.push(node);

    // A ShadowRoot's parentNode is null — hop to its host to keep walking.
    node = node.parentNode ?? (node instanceof ShadowRoot ? node.host : null);
  }

  return chain;
};

/**
 * Register a context value on a specific element.
 * @internal Backs the public `provide()` — do not call directly.
 */
const provideOnElement = <T>(el: HTMLElement, key: InjectionKey<T>, value: T): void => {
  const map = contextRegistry.get(el) ?? new Map<InjectionKey<unknown>, unknown>();

  // `inject()` memoizes its result per consumer (see resolvedCache below), so a
  // provider swapping the raw value after a descendant already read it would be
  // silently ignored downstream. Provide a `Readable` (signal/computed) instead
  // of a raw value so descendants observe updates through the value itself.
  if (map.has(key)) {
    warn(
      `provide(): key already provided on <${el.localName}> — overwriting. Provide a Readable to update it instead.`,
    );
  }

  map.set(key, value);
  contextRegistry.set(el, map);
};

/**
 * Register a context value on the current component's host element, making it
 * available to descendant components via `inject(key)`.
 *
 * Provide a `Readable` (signal/computed) rather than a raw value if descendants
 * need to observe later changes — `inject()` resolves and caches the value once
 * per consumer, so re-calling `provide()` with a new raw value later is not seen.
 */
export const provide = <T>(key: InjectionKey<T>, value: T): void => {
  provideOnElement(requireSetupContext('provide').element, key, value);
};

const NOT_FOUND_SENTINEL = Symbol('inject.not_found');

/** Per-setup-context cache: avoids repeated ancestor walks for the same key. */
const resolvedCache = new WeakMap<object, Map<InjectionKey<unknown>, unknown>>();

const walkAndFind = <T>(element: HTMLElement, key: InjectionKey<T>): T | typeof NOT_FOUND_SENTINEL => {
  const chain = buildAncestorChain(element);

  for (const node of chain) {
    const map = contextRegistry.get(node);

    if (map?.has(key)) return map.get(key) as T;
  }

  return NOT_FOUND_SENTINEL;
};

/** Cached ancestor-walk lookup shared by `inject()` and `injectStrict()`. */
const lookup = <T>(ctx: RuntimeContext, key: InjectionKey<T>): T | typeof NOT_FOUND_SENTINEL => {
  let cache = resolvedCache.get(ctx);

  if (!cache) {
    cache = new Map();
    resolvedCache.set(ctx, cache);
  }

  const cacheKey = key as InjectionKey<unknown>;

  if (!cache.has(cacheKey)) cache.set(cacheKey, walkAndFind(ctx.element, key));

  return cache.get(cacheKey) as T | typeof NOT_FOUND_SENTINEL;
};

export function inject<T>(key: InjectionKey<T>): T | undefined;
export function inject<T>(key: InjectionKey<T>, fallback: T): T;
export function inject<T>(key: InjectionKey<T>, ...rest: [T?]): T | undefined {
  const found = lookup(requireSetupContext('inject'), key);

  if (found === NOT_FOUND_SENTINEL) return rest.length > 0 ? rest[0] : undefined;

  return found;
}

export const injectStrict = <T>(key: InjectionKey<T>): T => {
  const ctx = requireSetupContext('injectStrict');
  const found = lookup(ctx, key);

  if (found !== NOT_FOUND_SENTINEL) return found;

  throw new OreApiError(ORE_ERRORS.injectStrictFailed(String(key), ctx.element.localName));
};

let anonymousKeyCounter = 0;

/**
 * Create a typed context key. `Symbol.for`-keyed (`ore:context:<description>`) so
 * a provider and an injector loaded from two bundled copies of ore still match
 * (see module header). Two `createContext('theme')` calls intentionally produce
 * the same key — use distinct descriptions for distinct contexts.
 *
 * Always pass a description: anonymous keys are minted from a per-graph counter,
 * so they do NOT survive duplicated module graphs (each copy numbers its own).
 */
export function createContext<T>(description?: string): InjectionKey<T> {
  if (description === undefined) {
    warn(
      'createContext() called without a description — anonymous context keys do not survive duplicated module graphs.',
    );
  }

  return Symbol.for(`ore:context:${description ?? `anonymous-${++anonymousKeyCounter}`}`) as InjectionKey<T>;
}
