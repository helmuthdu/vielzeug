import { type Schema, s } from '@vielzeug/spell';
import { ARCHIVE_LIMITS, isoTimestampSchema, uuidSchema } from '../contract';
import { badRequest, queryParams } from './http';

/**
 * The package's one pagination idiom: forward-only keyset pages. A cursor is an
 * opaque envelope of `{ context, createdAt, id, likeCount }` — `createdAt`/`id`
 * are the sort boundary (a timestamp and the row id), `likeCount` is the optional
 * extra sort field (the boundary count of the liked-sorted entry list), and
 * `context` names the query the cursor was minted for, so a cursor replayed under
 * a different query is a 400, never a silently wrong page.
 */
export const encodeCursorValue = (value: unknown): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
};

export function decodeCursorValue<T>(raw: string, schema: Schema<T>): T {
  if (raw.length > ARCHIVE_LIMITS.cursorChars || !/^[A-Za-z0-9_-]+$/.test(raw)) throw badRequest();
  let value: unknown;
  try {
    const base64 = raw.replaceAll('-', '+').replaceAll('_', '/');
    const bytes = Uint8Array.from(atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4)), (char) =>
      char.charCodeAt(0),
    );
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw badRequest();
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success || encodeCursorValue(value) !== raw) throw badRequest();
  return parsed.data;
}

/** One keyset boundary: timestamp, row id, and the liked sort's boundary count. */
export interface ForwardCursor {
  context: string;
  createdAt: string;
  id: string;
  likeCount?: number;
}

const forwardCursorSchema: Schema<ForwardCursor> = s.object({
  context: s.string(),
  createdAt: isoTimestampSchema,
  id: uuidSchema,
  // Only the liked-sorted entry list carries a boundary count; every other list
  // omits the key entirely.
  likeCount: s.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
});

/** Parses `limit` and the forward cursor from an already allow-listed parameter set. */
export function forwardPageParams(params: URLSearchParams, context: string) {
  const rawLimit = params.get('limit');
  const limit = rawLimit === null ? ARCHIVE_LIMITS.pageSize : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > ARCHIVE_LIMITS.maxPageSize) throw badRequest();
  const raw = params.get('cursor');
  const cursor = raw === null ? null : decodeCursorValue(raw, forwardCursorSchema);
  if (cursor !== null && cursor.context !== context) throw badRequest();
  return { cursor, limit };
}

/** Allow-lists the query, then parses `limit` and the forward cursor. */
export function forwardPage(request: Request, context: string, extra: readonly string[] = []) {
  const params = queryParams(new URL(request.url), ['cursor', 'limit', ...extra]);
  return { ...forwardPageParams(params, context), params };
}

export const nextCursor = (cursor: Omit<ForwardCursor, 'context'>, context: string): string =>
  encodeCursorValue({ ...cursor, context });
