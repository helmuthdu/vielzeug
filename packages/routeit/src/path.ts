import type { QueryParams, RouteMatcher, RouteParams, RouteRecord } from './types';

/** Ensure leading slash, collapse duplicate slashes, preserve root. */
export function normalizePath(path: string): string {
  const normalized = `/${path}`.replace(/\/+/g, '/');

  return normalized !== '/' && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

export function joinPaths(base: string, path: string): string {
  return normalizePath(`${normalizePath(base)}/${normalizePath(path)}`);
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodePart(value: string): string {
  return decodeURIComponent(value);
}

export function compilePathMatcher(path: string): RouteMatcher {
  const normalized = normalizePath(path);

  if (normalized === '/') {
    return {
      paramNames: [],
      pattern: /^\/$/,
      prefixPattern: /^\//,
    };
  }

  const paramNames: string[] = [];
  const segments = normalized.slice(1).split('/');
  const regexParts: string[] = ['^'];
  const prefixParts: string[] = ['^'];

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i]!;

    if (segment === '*') {
      regexParts.push('(?:/.*)?');
      break;
    }

    if (segment.startsWith(':') && segment.endsWith('*')) {
      const name = segment.slice(1, -1);

      paramNames.push(name);
      regexParts.push(i === segments.length - 1 ? '(?:/(.*))?' : '/(.*)');
      prefixParts.push('/.*');
      break;
    }

    if (segment.startsWith(':')) {
      const name = segment.slice(1);

      paramNames.push(name);
      regexParts.push('/([^/]+)');
      prefixParts.push('/[^/]+');
      continue;
    }

    const escaped = escapeRegex(segment);

    regexParts.push(`/${escaped}`);
    prefixParts.push(`/${escaped}`);
  }

  regexParts.push('$');
  prefixParts.push('(?:/.*)?$');

  return {
    paramNames,
    pattern: new RegExp(regexParts.join('')),
    prefixPattern: new RegExp(prefixParts.join('')),
  };
}

export function matchRecord(pathname: string, record: RouteRecord): RouteParams | null {
  const match = record.matcher.pattern.exec(pathname);

  if (!match) return null;

  const params: RouteParams = {};

  record.matcher.paramNames.forEach((name, index) => {
    const value = match[index + 1];

    params[name] = decodePart(value ?? '');
  });

  return params;
}

export function matchRoute(
  pathname: string,
  records: readonly RouteRecord[],
): { params: RouteParams; record?: RouteRecord } {
  for (const record of records) {
    const params = matchRecord(pathname, record);

    if (params) return { params, record };
  }

  return { params: {} };
}

export function matchesPrefix(pathname: string, record: RouteRecord): boolean {
  return record.matcher.prefixPattern.test(pathname);
}

/** Parse `?foo=a&foo=b&bar=c` into `{ foo: ['a', 'b'], bar: 'c' }`. */
export function parseQuery(queryString: string): QueryParams {
  const search = new URLSearchParams(queryString.startsWith('?') ? queryString : `?${queryString}`);
  const out: QueryParams = {};

  search.forEach((value, key) => {
    const existing = out[key];

    if (existing === undefined) out[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else out[key] = [existing, value];
  });

  return out;
}

/** Build a URL from a path pattern, params, and query, respecting the router base. */
export function buildUrl(base: string, pattern: string, params: RouteParams = {}, query?: QueryParams): string {
  let path = pattern.replace(/:(\w+)(\*)?/g, (_match, key: string, isWildcard: string) => {
    const value = params[key];

    if (value == null) throw new Error(`[routeit] Missing path param: ${key}`);

    if (isWildcard) {
      return value
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');
    }

    return encodeURIComponent(value);
  });

  if (query && Object.keys(query).length) {
    const search = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) value.forEach((item) => search.append(key, item));
      else search.set(key, value);
    });

    path += `?${search.toString()}`;
  }

  return joinPaths(base, path);
}
