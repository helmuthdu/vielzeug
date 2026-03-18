import type { RouteParams, QueryParams } from './types';

/** -------------------- Path Utilities -------------------- **/

export function normalizePath(path: string): string {
  if (!path) return '/';

  const normalized = `/${path.trim()}`.replace(/\/+/g, '/');

  return normalized !== '/' && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

export function buildRegexStr(pattern: string): { paramNames: string[]; regexStr: string } {
  const paramNames: string[] = [];
  const regexStr = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\/:([\w]+)\*/g, (_, name) => {
      paramNames.push(name);

      return '(?:/(.*)|$)';
    })
    .replace(/:([\w]+)\*/g, (_, name) => {
      paramNames.push(name);

      return '(.*)';
    })
    .replace(/\*/g, '.*')
    .replace(/:([\w]+)/g, (_, name) => {
      paramNames.push(name);

      return '([^/]+)';
    });

  return { paramNames, regexStr };
}

export function compilePattern(pattern: string, exact = true): { paramNames: string[]; regex: RegExp } {
  const { paramNames, regexStr } = buildRegexStr(pattern);
  // Wildcard patterns never need a $ anchor; exact patterns do; prefix patterns use (/.*)?$
  const anchor = pattern.endsWith('*') ? '' : exact ? '$' : '(/.*)?$';

  return { paramNames, regex: new RegExp(`^${regexStr}${anchor}`) };
}

export function matchRecord(pathname: string, record: { paramNames: string[]; regex: RegExp }): RouteParams | null {
  const match = pathname.match(record.regex);

  if (!match) return null;

  return Object.fromEntries(record.paramNames.map((name, i) => [name, decodeURIComponent(match[i + 1] ?? '')]));
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
