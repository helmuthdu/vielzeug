import type { RandomSource } from '@vielzeug/arsenal/random';
import * as commerceApi from './commerce/commerce';
import * as dateApi from './date/date';
import * as financeApi from './finance/finance';
import * as internetApi from './internet/internet';
import * as locationApi from './location/location';
import * as loremApi from './lorem/lorem';
import * as personApi from './person/person';
import { createSeed } from './seed/create-seed';
import * as systemApi from './system/system';
import type { IllusionistContext, IllusionistLocale, IllusionistOptions } from './types';

export type { IllusionistOptions } from './types';

/** Strips the leading `IllusionistContext` parameter from a function type. */
type Bound<F> = F extends (ctx: IllusionistContext, ...args: infer A) => infer R ? (...args: A) => R : F;

/** Maps a module of `(ctx, ...args) => R` functions to `(...args) => R`. */
type BoundApi<T> = { readonly [K in keyof T]: Bound<T[K]> };

export type Illusionist = {
  readonly person: BoundApi<typeof personApi>;
  readonly internet: BoundApi<typeof internetApi>;
  readonly commerce: BoundApi<typeof commerceApi>;
  readonly date: BoundApi<typeof dateApi>;
  readonly finance: BoundApi<typeof financeApi>;
  readonly location: BoundApi<typeof locationApi>;
  readonly lorem: BoundApi<typeof loremApi>;
  readonly system: BoundApi<typeof systemApi>;

  /** The seed used to initialize this instance, or `undefined` for cryptographic randomness. */
  readonly seed: number | string | undefined;
  /** The active locale data. */
  readonly locale: IllusionistLocale;

  dispose(): void;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  [Symbol.dispose](): void;
};

/**
 * Creates a bound illusionist instance with all categories sharing a single seeded
 * random source and locale.
 *
 * @example
 * ```ts
 * import { en } from '@vielzeug/illusionist/locales';
 *
 * const illusion = createIllusion({ seed: 12345, locale: en });
 *
 * illusion.person.fullName();    // deterministic — same seed → same result
 * illusion.internet.email();
 * illusion.commerce.price();
 * illusion.dispose();            // [Symbol.dispose]() also works
 * ```
 */
export function createIllusion(options: IllusionistOptions): Illusionist {
  const { locale, seed } = options;
  const source: RandomSource = createSeed(seed);
  const controller = new AbortController();
  let disposed = false;

  const ctx: IllusionistContext = { locale, source };

  const bind = <T extends Record<string, (ctx: IllusionistContext, ...args: never[]) => unknown>>(
    api: T,
  ): BoundApi<T> => {
    const bound = {} as Record<string, (...args: never[]) => unknown>;

    for (const [key, fn] of Object.entries(api)) {
      if (typeof fn === 'function') {
        bound[key] = (...args: never[]) => (fn as (ctx: IllusionistContext, ...args: never[]) => unknown)(ctx, ...args);
      }
    }

    return bound as unknown as BoundApi<T>;
  };

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    controller.abort();
  };

  return {
    commerce: bind(commerceApi),
    date: bind(dateApi),
    get disposalSignal(): AbortSignal {
      return controller.signal;
    },
    dispose,
    get disposed(): boolean {
      return disposed;
    },
    finance: bind(financeApi),
    internet: bind(internetApi),
    locale,
    location: bind(locationApi),
    lorem: bind(loremApi),
    person: bind(personApi),
    seed,
    system: bind(systemApi),
    [Symbol.dispose]: dispose,
  };
}
