import type { QueryParams, QueryParamsInput, RemoteSourceQuery, SourceQuery } from './types';

import { devOnly, warn } from './_dev';
import { sanitizeForLog } from './_utils';
import { SourcererError } from './errors';

/**
 * Serialises a `SourceQuery` or `RemoteSourceQuery` into plain URL-safe string params.
 *
 * ⚠️ `filter` and `sort` are JSON-stringified without a try/catch. A circular object reference
 * throws a native `TypeError` ("Converting circular structure to JSON") straight out of this
 * function — ensure filter/sort values are plain serialisable objects, or wrap the call yourself.
 *
 * ⚠️ Round-trip fidelity: `page` and `limit` must be positive integers. `encodeQuery` will
 * serialise any number (including 0), but `decodeQuery` clamps non-positive values to 1/defaultLimit.
 *
 * `encodeQuery` + `decodeQuery` form a round-trip pair: filter/sort values are JSON-stringified
 * on encode and JSON-parsed on decode.
 */
export const encodeQuery = <TFilter = unknown, TSort = unknown>(
  query: RemoteSourceQuery<TFilter, TSort> | SourceQuery,
): QueryParams => {
  const base: QueryParams = {
    ...(query.search && { search: query.search }),
    limit: String(query.limit),
    page: String(query.page),
  };

  const rq = query as RemoteSourceQuery<TFilter, TSort>;

  if (rq.filter !== undefined) {
    base['filter'] = JSON.stringify(rq.filter);
  }

  if (rq.sort !== undefined) {
    base['sort'] = JSON.stringify(rq.sort);
  }

  return base;
};

export type DecodeQueryOptions = Readonly<{
  defaultLimit?: number;
  strict?: boolean;
}>;

/**
 * Parses URL query params into a `Partial<RemoteSourceQuery<unknown, unknown>>`.
 * Accepts either a plain `Record<string, string | string[] | undefined>` or a `URLSearchParams` instance.
 *
 * - `filter` and `sort` are JSON-parsed and typed as `unknown` — validate and narrow them
 *   with a runtime schema (e.g. Zod) before passing to `source.patch(...)`.
 * - `search` is omitted from the result when the param is absent (rather than defaulting to `''`).
 * - `limit` and `page` are parsed as positive integers; invalid values fall back to defaults.
 */
export const decodeQuery = (
  params: QueryParamsInput | URLSearchParams,
  options: DecodeQueryOptions = {},
): Partial<RemoteSourceQuery<unknown, unknown>> => {
  const raw: QueryParamsInput =
    params instanceof URLSearchParams ? (Object.fromEntries(params.entries()) as QueryParamsInput) : params;

  const { defaultLimit = 20, strict = false } = options;

  // Deliberately not `_utils.ts::clampPositiveInt` here: that one truncates a fractional
  // config value (2.5 -> 2) as a harmless normalization, and always floors invalid input to 1.
  // A URL param is untrusted network input, not a caller's own config object — "2.5" or "-5"
  // in a query string is more likely a corrupted/tampered link than a rounding artifact, so
  // this stays strict (reject anything that isn't a clean positive integer) and falls back to
  // the caller's own `defaultLimit`/`1`, not an unconditional floor of 1.
  //
  // @security `str` is the raw, attacker-controllable param value (this function's whole job
  // is parsing untrusted `location.search`/route params) — sanitize before interpolating into
  // the warning to prevent terminal-escape-sequence injection into a developer's console.
  const parsePositiveInt = (fieldName: string, value: string | string[] | undefined, fallback: number): number => {
    if (value === undefined) return fallback;

    const str = Array.isArray(value) ? value[0] : value;
    const n = Number(str);

    if (Number.isInteger(n) && n > 0) return n;

    devOnly(() =>
      warn(`decodeQuery: ${fieldName} "${sanitizeForLog(str, 80)}" is not a positive integer — using ${fallback}.`),
    );

    return fallback;
  };

  // @security Same as `parsePositiveInt` above — `str` is untrusted and may end up in a
  // terminal/log aggregator via this error's `.message`, not just a direct `console.warn`.
  const parseJson = (key: string, value: string | string[] | undefined): unknown => {
    if (value === undefined) return undefined;

    const str = Array.isArray(value) ? value[0] : value;

    try {
      return JSON.parse(str) as unknown;
    } catch {
      if (strict) throw new SourcererError(`Invalid query param "${key}": ${sanitizeForLog(str, 80)}`);

      return undefined;
    }
  };

  const rawLimit = raw['limit'];
  const rawPage = raw['page'];
  const rawSearch = raw['search'];
  const rawFilter = raw['filter'];
  const rawSort = raw['sort'];

  const filter = rawFilter !== undefined ? parseJson('filter', rawFilter) : undefined;
  const sort = rawSort !== undefined ? parseJson('sort', rawSort) : undefined;

  const result: Partial<RemoteSourceQuery<unknown, unknown>> = {
    ...(filter !== undefined && { filter }),
    ...(sort !== undefined && { sort }),
    ...(rawSearch !== undefined && { search: Array.isArray(rawSearch) ? rawSearch[0] : rawSearch }),
    limit: parsePositiveInt('limit', rawLimit, defaultLimit),
    page: parsePositiveInt('page', rawPage, 1),
  };

  return result;
};
