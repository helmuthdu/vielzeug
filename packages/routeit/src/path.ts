import type { QueryParams, RouteParams, RouteRecord, RouteSegment } from './types';

/** Ensure leading slash, collapse duplicate slashes, preserve root. */
export function normalizePath(path: string): string {
  const normalized = `/${path}`.replace(/\/+/g, '/');

  return normalized !== '/' && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

export function joinPaths(base: string, path: string): string {
  return normalizePath(`${normalizePath(base)}/${normalizePath(path)}`);
}

function splitSegments(path: string): string[] {
  const normalized = normalizePath(path);

  return normalized === '/' ? [] : normalized.slice(1).split('/');
}

export function compileRouteSegments(path: string): RouteSegment[] {
  return splitSegments(path).map((segment) => {
    if (segment === '*') return { kind: 'splat' };

    if (segment.startsWith(':') && segment.endsWith('*')) {
      return { kind: 'param-splat', name: segment.slice(1, -1) };
    }

    if (segment.startsWith(':')) return { kind: 'param', name: segment.slice(1) };

    return { kind: 'static', value: segment };
  });
}

function decodeSegment(segment: string): string {
  return decodeURIComponent(segment);
}

export function matchRecord(pathname: string, record: RouteRecord): RouteParams | null {
  const pathnameSegments = splitSegments(pathname);
  const params: RouteParams = {};

  let pathnameIndex = 0;

  for (let segmentIndex = 0; segmentIndex < record.segments.length; segmentIndex++) {
    const segment = record.segments[segmentIndex];
    const current = pathnameSegments[pathnameIndex];

    if (segment.kind === 'splat') {
      pathnameIndex = pathnameSegments.length;
      break;
    }

    if (segment.kind === 'param-splat') {
      params[segment.name] = pathnameSegments.slice(pathnameIndex).map(decodeSegment).join('/');
      pathnameIndex = pathnameSegments.length;
      break;
    }

    if (current === undefined) return null;

    if (segment.kind === 'static') {
      if (segment.value !== current) return null;

      pathnameIndex += 1;
      continue;
    }

    params[segment.name] = decodeSegment(current);
    pathnameIndex += 1;
  }

  return pathnameIndex === pathnameSegments.length ? params : null;
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
  const pathnameSegments = splitSegments(pathname);

  let pathnameIndex = 0;

  for (const segment of record.segments) {
    const current = pathnameSegments[pathnameIndex];

    if (segment.kind === 'splat' || segment.kind === 'param-splat') return true;

    if (current === undefined) return false;

    if (segment.kind === 'static' && segment.value !== current) return false;

    pathnameIndex += 1;
  }

  return true;
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
