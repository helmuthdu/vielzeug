type QueryScalar = string | number | boolean | null;

export type ParamValue = QueryScalar | readonly QueryScalar[] | undefined;
export type Params = Record<string, ParamValue>;

// Type-safe path params: extracts {param} placeholders from a path string
type ExtractPathParams<P extends string> = P extends `${string}{${infer K}}${infer R}`
  ? K | ExtractPathParams<R>
  : never;

type PathConfig<P extends string> = [ExtractPathParams<P>] extends [never]
  ? { params?: never }
  : { params: Record<ExtractPathParams<P>, string | number | boolean> };

export type HttpRequestConfig<P extends string = string> = Omit<RequestInit, 'body' | 'method'> &
  PathConfig<P> & {
    body?: unknown;
    dedupeKey?: unknown;
    query?: Params;
    timeout?: number;
  };

export function buildUrl(base: string, path: string, params?: Params, query?: Params): string {
  const baseClean = base.replace(/\/+$/, '');
  let pathClean = path.replace(/^\/+/, '');

  pathClean = pathClean.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const val = params?.[key];

    if (val === undefined) throw new Error(`[fetchit] unresolved path param {${key}} in '${path}'`);

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
