import { CourierParseError } from './errors.js';
import type { ResponseType } from './response.js';

type QueryScalar = string | number | boolean | null;

export type ParamValue = QueryScalar | readonly QueryScalar[] | undefined;
export type Params = Record<string, ParamValue>;

export type CourierCacheKeyAtom = string | number | boolean | null;
export type CourierCacheKey = readonly [CourierCacheKeyAtom, ...CourierCacheKeyAtom[]];
export type CourierCacheOptions = {
  capacity?: number;
  ttlMs?: number;
};
export type CourierReadCache = {
  key: CourierCacheKey;
  ttlMs?: number;
};

// Type-safe path params: extracts {param} placeholders from a path string
type ExtractPathParams<P extends string> = P extends `${string}{${infer K}}${infer R}`
  ? K | ExtractPathParams<R>
  : never;

export type PathConfig<P extends string> = string extends P
  ? { params?: Record<string, string | number | boolean> }
  : [ExtractPathParams<P>] extends [never]
    ? { params?: never }
    : { params: Record<ExtractPathParams<P>, string | number | boolean> };

type ParsedResponseConfig<T> = {
  /** Response parsing strategy. */
  responseType?: Exclude<ResponseType, 'raw'>;
  /**
   * Optional schema for response validation. Any object with a `parse(data)` method
   * works — e.g. a `@vielzeug/spell` schema or a plain validator function wrapper.
   * Called after the response body is parsed; throws if validation fails.
   * The schema's return type must be assignable to `T`.
   */
  schema?: { parse(data: unknown): T };
};

type RawResponseConfig = { responseType: 'raw'; schema?: never };

type RequestOptions = {
  /** Request body. BodyInit values pass through; other JSON-serializable values are encoded. */
  body?: unknown;
  /** Query string parameters. */
  query?: Params;
  /** Request timeout in ms. Overrides client default. */
  timeout?: number;
};

type HttpOptions = {
  /** Raw fetch options for advanced use (credentials, cache, mode, referrer, etc.). */
  fetchInit?: Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>;
  /** Per-request headers merged with (and overriding) global client headers. */
  headers?: HeadersInit;
  /** External abort signal merged with internal cancellation. */
  signal?: AbortSignal;
};

export type CourierRequestConfig<P extends string = string, T = unknown> = PathConfig<P> &
  (ParsedResponseConfig<T> | RawResponseConfig) &
  RequestOptions;

export type HttpRequestConfig<P extends string = string, T = unknown> = CourierRequestConfig<P, T> &
  HttpOptions & { cache?: never };

export type GetRequestConfig<P extends string = string, T = unknown> = PathConfig<P> &
  ((ParsedResponseConfig<T> & { cache?: CourierReadCache }) | (RawResponseConfig & { cache?: never })) &
  RequestOptions &
  HttpOptions & { body?: never };
export type PrefetchConfig<P extends string = string, T = unknown> = PathConfig<P> &
  ParsedResponseConfig<T> &
  Omit<RequestOptions, 'body' | 'timeout'> &
  Omit<HttpOptions, 'signal'> & { body?: never; cache: CourierReadCache; signal?: never; timeout?: never };
export type RequestConfig<P extends string = string, T = unknown> = HttpRequestConfig<P, T> & { method?: string };

export function buildUrl(base: string, path: string, params?: Params, query?: Params): string {
  const baseClean = base.replace(/\/+$/, '');
  let pathClean = baseClean ? path.replace(/^\/+/, '') : path;

  pathClean = pathClean.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const val = params?.[key];

    if (val === undefined || val === null) throw new CourierParseError(`unresolved path param {${key}} in '${path}'`);

    return encodeURIComponent(String(val));
  });

  const url = baseClean && pathClean ? `${baseClean}/${pathClean}` : baseClean || pathClean;

  if (!query) return url;

  const qs = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry !== undefined) {
          qs.append(key, entry === null ? '' : String(entry));
        }
      }

      continue;
    }

    qs.append(key, value === null ? '' : String(value));
  }

  const queryString = qs.toString();

  if (!queryString) return url;

  const hashIndex = url.indexOf('#');
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex);

  return `${beforeHash}${beforeHash.includes('?') ? '&' : '?'}${queryString}${hash}`;
}
