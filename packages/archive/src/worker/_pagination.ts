import { type Schema, s } from '@vielzeug/spell';
import { ARCHIVE_LIMITS, isoTimestampSchema, uuidSchema } from '../contract';
import { badRequest, queryParams } from './http';

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

const forwardCursorSchema = s.object({
  context: s.string(),
  createdAt: isoTimestampSchema,
  id: uuidSchema,
});

export interface ForwardCursor {
  createdAt: string;
  id: string;
}

export function forwardPage(request: Request, context: string, extra: readonly string[] = []) {
  const params = queryParams(new URL(request.url), ['cursor', 'limit', ...extra]);
  const rawLimit = params.get('limit');
  const limit = rawLimit === null ? ARCHIVE_LIMITS.pageSize : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > ARCHIVE_LIMITS.maxPageSize) throw badRequest();
  const raw = params.get('cursor');
  const cursor = raw === null ? null : decodeCursorValue(raw, forwardCursorSchema);
  if (cursor !== null && cursor.context !== context) throw badRequest();
  return { cursor, limit, params };
}

export const nextCursor = (row: ForwardCursor, context: string): string =>
  encodeCursorValue({ context, createdAt: row.createdAt, id: row.id });
