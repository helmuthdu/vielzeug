import type { RouteParams, QueryParams, RouteRecord } from './types';
/** -------------------- Path Utilities -------------------- **/

const URL_PATTERN_BASE = 'http://localhost';

function toMatchUrl(pathname: string): URL {
  return new URL(normalizePath(pathname), URL_PATTERN_BASE);
}

export function extractParamNames(pattern: string): string[] {
  const names: string[] = [];

  pattern.replace(/:([\w]+)\*?/g, (_, name: string) => {
    names.push(name);

    return '';
  });

  return names;
}

/**
 * Convert a route pattern to URLPattern syntax.
 * Example: '/users/:id' -> '/users/:id(\d+)?'
 * URLPattern requires a protocol and hostname, so we use a placeholder base.
 */
function patternToURLPattern(pattern: string): string {
  // URLPattern requires named wildcards, so we normalize bare splats.
  return pattern.replace(/\/\*/g, '/:__splat*');
}

/**
 * Create an exact URLPattern instance for a route.
 */
export function createURLPattern(pattern: string): URLPattern {
  return new URLPattern({ pathname: patternToURLPattern(pattern) }, URL_PATTERN_BASE);
}

/**
 * Create a prefix URLPattern instance for `isActive(..., false)` checks.
 */
export function createPrefixURLPattern(pattern: string): URLPattern {
  if (pattern.endsWith('*')) return createURLPattern(pattern);

  return createURLPattern(pattern === '/' ? '/*' : `${pattern}/*`);
}

export function normalizePath(path: string): string {
  if (!path) return '/';

  const normalized = `/${path.trim()}`.replace(/\/+/g, '/');

  return normalized !== '/' && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

export function matchRecordWithPattern(pathname: string, record: RouteRecord): RouteParams | null {
  const match = record.urlPattern.exec(toMatchUrl(pathname));

  if (!match) return null;

  return Object.fromEntries(
    record.paramNames.map((name) => [name, decodeURIComponent(match.pathname.groups[name] ?? '')]),
  );
}

export function testRecordWithPattern(pathname: string, pattern: URLPattern): boolean {
  return pattern.test(toMatchUrl(pathname));
}

const E = '[routeit]';

export function parseQuery(search: string): QueryParams {
  const params: QueryParams = {};

  for (const [key, value] of new URLSearchParams(search)) {
    const existing = params[key];

    if (existing === undefined) params[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else params[key] = [existing, value];
  }

  return params;
}

export function joinPaths(base: string, path: string): string {
  const a = normalizePath(base);
  const b = normalizePath(path);

  return a === '/' ? b : b === '/' ? a : `${a}${b}`;
}

export function buildUrl(base: string, path: string, params?: RouteParams, query?: QueryParams): string {
  const url = path.replace(/:(\w+)(\*)?/g, (_, k, star) => {
    const value = params?.[k];

    if (value === undefined) throw new Error(`${E} Missing URL param: "${k}"`);

    // Wildcard params may contain '/' — don't encode them, and the trailing * is stripped implicitly
    return star ? value : encodeURIComponent(value);
  });

  if (query && Object.keys(query).length > 0) {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) for (const v of value) search.append(key, v);
      else search.set(key, value);
    }

    return joinPaths(base, `${url}?${search}`);
  }

  return joinPaths(base, url);
}
