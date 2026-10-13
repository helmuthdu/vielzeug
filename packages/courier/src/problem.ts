import { mediaTypeOf } from './mediaType.js';

/**
 * RFC 9457 (obsoleting RFC 7807) problem details, as carried by an
 * `application/problem+json` error body.
 *
 * All five registered members are optional — only `type` has a default (`about:blank`)
 * — and any further member is an extension, which is why the index signature is part
 * of the shape instead of a separate extensions bag.
 */
export type ProblemDetail = Readonly<{
  /** URI reference identifying the problem type. Defaults to `about:blank`. */
  type?: string;
  /** HTTP status the origin server generated for this problem. */
  status?: number;
  /** Short, human-readable category of the error. Stable per problem class. */
  title?: string;
  /** Human-readable summary. May change per occurrence; never machine-parsed. */
  detail?: string;
  /** URI reference identifying the specific occurrence of the problem. */
  instance?: string;
  [extension: string]: unknown;
}>;

/** Media type registered for problem details (RFC 9457 §3). */
export const PROBLEM_JSON_MEDIA_TYPE = 'application/problem+json';

/**
 * Matches `application/problem+json` and its parameterised forms
 * (`application/problem+json;charset=utf-8`) but not plain `application/json`.
 */
export function isProblemMediaType(contentType: string | null | undefined): boolean {
  return mediaTypeOf(contentType) === PROBLEM_JSON_MEDIA_TYPE;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Interpret a parsed response body as problem details. Returns `undefined` for arrays,
 * primitives, and `null`: a server that answers `problem+json` with anything but an
 * object keeps its raw body on `data` and reports no `problem`.
 */
export function asProblemDetail(data: unknown): ProblemDetail | undefined {
  return isPlainObject(data) ? (Object.freeze({ ...data }) as ProblemDetail) : undefined;
}
