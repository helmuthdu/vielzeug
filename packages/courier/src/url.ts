import type { ResponseType } from './response';

type QueryScalar = string | number | boolean | null;

export type ParamValue = QueryScalar | readonly QueryScalar[] | undefined;
export type Params = Record<string, ParamValue>;

// Type-safe path params: extracts {param} placeholders from a path string
type ExtractPathParams<P extends string> = P extends `${string}{${infer K}}${infer R}`
  ? K | ExtractPathParams<R>
  : never;

export type PathConfig<P extends string> = [ExtractPathParams<P>] extends [never]
  ? { params?: never }
  : { params: Record<ExtractPathParams<P>, string | number | boolean> };

export type CourierRequestConfig<P extends string = string, T = unknown> = PathConfig<P> & {
  /** Request body. Plain objects → JSON. BodyInit values passed as-is. */
  body?: unknown;
  /**
   * Set to `false` to bypass in-flight deduplication for this request.
   * Safe + idempotent methods (GET, HEAD, OPTIONS) are deduplicated by default.
   * DELETE is idempotent but has side-effects, so it does not auto-dedupe;
   * pass an explicit `dedupeKey` to opt in.
   */
  dedupe?: boolean;
  /** Explicit deduplication key for non-idempotent requests. */
  dedupeKey?: unknown;
  /** Query string parameters. */
  query?: Params;
  /** Response parsing strategy. */
  responseType?: ResponseType;
  /**
   * Optional schema for response validation. Any object with a `parse(data)` method
   * works — e.g. a `@vielzeug/spell` schema or a plain validator function wrapper.
   * Called after the response body is parsed; throws if validation fails.
   * The schema's return type must be assignable to `T`.
   */
  schema?: { parse(data: unknown): T };
  /** Request timeout in ms. Overrides client default. */
  timeout?: number;
};

export type HttpRequestConfig<P extends string = string, T = unknown> = CourierRequestConfig<P, T> & {
  /** Raw fetch options for advanced use (credentials, cache, mode, referrer, etc.). */
  fetchInit?: Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>;
  /** Per-request headers merged with (and overriding) global client headers. */
  headers?: Record<string, string>;
  /** External abort signal merged with internal cancellation. */
  signal?: AbortSignal;
};

export function buildUrl(base: string, path: string, params?: Params, query?: Params): string {
  const baseClean = base.replace(/\/+$/, '');
  let pathClean = path.replace(/^\/+/, '');

  pathClean = pathClean.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const val = params?.[key];

    if (val === undefined || val === null) throw new Error(`[courier] unresolved path param {${key}} in '${path}'`);

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

  return queryString ? `${url}${url.includes('?') ? '&' : '?'}${queryString}` : url;
}
