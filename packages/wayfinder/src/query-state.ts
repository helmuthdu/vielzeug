import { computed, type Readable } from '@vielzeug/ripple';
import { WayfinderConfigError } from './errors';
import { createRouteSignals } from './route-signals';
import type { Router } from './router';
import type { NavigateOptions, RouteTable } from './types';

/** Encode result: a raw query value, or `undefined` to omit the parameter from the URL. */
export type RawParamValue = string | string[] | undefined;

/** One URL query parameter: a default that equals "absent", plus lenient decode/encode. */
export type ParamSpec<T> = {
  /** Missing or malformed input always decodes to `default` — the URL is untrusted. */
  decode(raw: string | string[] | undefined): T;
  /** Returning `undefined` (the value equals the default) removes the parameter. */
  encode(value: T): RawParamValue;
  readonly default: T;
};

const EMPTY_LIST: readonly string[] = Object.freeze([]);

const first = (raw: string | string[] | undefined): string | undefined => (Array.isArray(raw) ? raw[0] : raw);

/** The built-in parameter codecs; a codec's default is always the param-absent state. */
export interface PickParam {
  /** Without a default, absent or unknown values decode to `undefined` (and are omitted when written). */
  <const Values extends readonly string[]>(values: Values): ParamSpec<Values[number] | undefined>;
  /** Absent or unknown values decode to `defaultValue` (and are omitted when written). */
  <const Values extends readonly string[]>(values: Values, defaultValue: Values[number]): ParamSpec<Values[number]>;
}

export const param = Object.freeze({
  boolean(defaultValue = false): ParamSpec<boolean> {
    return {
      decode: (raw) => {
        const value = first(raw);
        if (value === '1' || value === 'true') return true;
        if (value === '0' || value === 'false') return false;
        return defaultValue;
      },
      default: defaultValue,
      encode: (value) => (value === defaultValue ? undefined : value ? '1' : '0'),
    };
  },
  list(): ParamSpec<readonly string[]> {
    return {
      decode: (raw) => (raw === undefined ? EMPTY_LIST : Array.isArray(raw) ? [...raw] : [raw]),
      default: EMPTY_LIST,
      encode: (value) => (value.length === 0 ? undefined : value.length === 1 ? value[0] : [...value]),
    };
  },
  number(defaultValue = 0): ParamSpec<number> {
    return {
      decode: (raw) => {
        const value = first(raw);
        if (value === undefined || value === '') return defaultValue;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : defaultValue;
      },
      default: defaultValue,
      encode: (value) => (value === defaultValue || !Number.isFinite(value) ? undefined : String(value)),
    };
  },
  pick: ((values: readonly string[], defaultValue?: string) => ({
    decode: (raw: string | string[] | undefined) => {
      const value = first(raw);
      return value !== undefined && values.includes(value) ? value : defaultValue;
    },
    default: defaultValue,
    encode: (value: string | undefined) => (value === undefined || value === defaultValue ? undefined : value),
  })) as PickParam,
  string(defaultValue = ''): ParamSpec<string> {
    return {
      decode: (raw) => first(raw) ?? defaultValue,
      default: defaultValue,
      encode: (value) => (value === defaultValue ? undefined : value),
    };
  },
});

export type QueryStateSpec = { readonly [key: string]: ParamSpec<unknown> };

type SpecValue<S extends QueryStateSpec> = { [K in keyof S]: S[K] extends ParamSpec<infer T> ? T : never };

export type QueryStateOptions = NavigateOptions;

/** Per-write overrides of the state-level navigation options. */
export type QueryStateSetOptions = NavigateOptions;

/**
 * Navigation options accepted by a write: the router's own `NavigateOptions`, with
 * `replace` defaulted to `true` because a query-parameter edit is a revision of the
 * current view, not a new page. Any other option (`viewTransition`, `force`, `state`)
 * is forwarded untouched, so a page whose router animates route changes can still
 * suppress the transition for a filter edit.
 */

export type QueryState<S extends QueryStateSpec> = {
  /** Reactive value per declared parameter. */
  readonly params: { readonly [K in keyof S]: Readable<S[K] extends ParamSpec<infer T> ? T : never> };
  /** Reactive snapshot of every declared parameter at once. */
  readonly query: Readable<SpecValue<S>>;
  /** Declared parameters removed from the URL (their defaults restored) in one navigation. */
  reset(options?: QueryStateSetOptions): void;
  /** Typed partial update of declared parameters; unknown keys throw. One navigation per call. */
  set(patch: Partial<SpecValue<S>>, options?: QueryStateSetOptions): void;
};

/**
 * Reactive, typed bindings between ripple state and the URL query string.
 *
 * Reads are derived from the router's live location, so back/forward and external
 * `navigate()` calls update them automatically. Writes merge into the *current* query —
 * undeclared parameters, the path, and the hash survive untouched — and land as a single
 * (replace by default) navigation through the router, so history mode, base path,
 * middleware, and guards keep working. A parameter written back to its default is removed
 * from the URL. Decoding is lenient: a malformed URL value falls back to the default
 * instead of throwing, because query strings are untrusted input.
 *
 * ```ts
 * const filters = createQueryState(router, {
 *   page: param.number(1),
 *   sort: param.pick(['price', 'name'] as const, 'price'),
 *   tags: param.list(),
 * });
 *
 * filters.page.value;            // reactive number, `1` when ?page is absent
 * filters.set({ page: 2 });      // ?page=2, replace, other params preserved
 * ```
 */
export function createQueryState<S extends QueryStateSpec, TRoutes extends RouteTable>(
  router: Router<TRoutes>,
  spec: S,
  options: QueryStateOptions = {},
): QueryState<S> {
  const routeSignals = createRouteSignals(router);
  const keys = Object.keys(spec);

  const params: Record<string, Readable<unknown>> = {};
  for (const key of keys) {
    const definition = spec[key] as ParamSpec<unknown>;
    params[key] = computed(() => definition.decode(routeSignals.query.value[key]));
  }

  const readAll = (): SpecValue<S> => {
    const out: Record<string, unknown> = {};
    for (const key of keys) out[key] = params[key]?.value;
    return out as SpecValue<S>;
  };

  const write = (patch: Partial<SpecValue<S>>, opts: QueryStateSetOptions | undefined): void => {
    for (const key of Object.keys(patch)) {
      if (!Object.hasOwn(spec, key)) throw new WayfinderConfigError(`createQueryState: undeclared param "${key}"`);
    }
    const location = router.getSnapshot().location;
    const next: Record<string, string | string[]> = { ...location.query };
    for (const [key, value] of Object.entries(patch)) {
      const raw = (spec[key] as ParamSpec<unknown>).encode(value);
      if (raw === undefined) delete next[key];
      else next[key] = raw;
    }

    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (Array.isArray(value)) for (const item of value) search.append(key, item);
      else search.set(key, value);
    }
    const query = search.toString();
    const href = `${location.pathname}${query === '' ? '' : `?${query}`}${location.hash === '' ? '' : `#${location.hash}`}`;

    // Fire-and-forget for UI handlers: loader failures still surface through the router's
    // onError/status channels, so the floating promise is deliberately swallowed here.
    const navigation: NavigateOptions = { replace: true };
    for (const source of [options, opts]) {
      for (const [key, value] of Object.entries(source ?? {})) {
        if (value !== undefined) (navigation as Record<string, unknown>)[key] = value;
      }
    }

    router.navigate(href, navigation).catch(() => {});
  };

  return {
    params: params as unknown as QueryState<S>['params'],
    query: computed(readAll),
    reset: (opts) => {
      const defaults: Partial<SpecValue<S>> = {};
      for (const key of keys) (defaults as Record<string, unknown>)[key] = spec[key].default;
      write(defaults, opts);
    },
    set: (patch, opts) => {
      write(patch, opts);
    },
  };
}
