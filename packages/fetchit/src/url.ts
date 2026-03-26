export type ParamValue = string | number | boolean | undefined;
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
    dedupe?: boolean;
    query?: Params;
    timeout?: number;
  };

export function buildUrl(base: string, path: string, params?: Params, query?: Params): string {
  const baseClean = base.replace(/\/+$/, '');
  let pathClean = path.replace(/^\/+/, '');

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        pathClean = pathClean.replaceAll(`{${key}}`, encodeURIComponent(String(value)));
      }
    }
  }

  const unresolved = pathClean.match(/\{[^}]+\}/g);

  if (unresolved) throw new Error(`[fetchit] unresolved path params: ${unresolved.join(', ')}`);

  const url = baseClean && pathClean ? `${baseClean}/${pathClean}` : baseClean || pathClean;

  if (!query) return url;

  const qs = new URLSearchParams(
    Object.entries(query)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();

  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;
}
