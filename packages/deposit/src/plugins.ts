import type { AnySchema, RecordOf } from './types';

/**
 * Narrow logger interface satisfied structurally by `@vielzeug/logit` Logger.
 * Pass a logit Logger instance directly — no adapter needed:
 *
 * ```ts
 * import { createLogger } from '@vielzeug/logit';
 * const db = createMemory({ schema, logger: createLogger('db') });
 * ```
 *
 * Any structured logger exposing `debug`, `warn`, and `error` also works.
 */
export interface DepositLogger {
  debug(msgOrCtx: Record<string, unknown> | string, message?: string): void;
  error(msgOrCtxOrErr: Record<string, unknown> | Error | string, message?: string): void;
  warn(msgOrCtx: Record<string, unknown> | string, message?: string): void;
}

/**
 * Minimal parser interface satisfied structurally by `@vielzeug/validit` Schema.
 * Pass a validit schema directly — no adapter needed:
 *
 * ```ts
 * import { v } from '@vielzeug/validit';
 * const db = createMemory({
 *   schema: { users: table<User>('id') },
 *   validators: { users: v.object({ id: v.number(), name: v.string() }) },
 * });
 * ```
 *
 * Any object with a `parseSync(value: unknown): T` method works — including
 * Zod schemas adapted through a thin shim.
 */
export interface RecordParser<T> {
  parseSync(value: unknown): T;
}

/**
 * Per-table record parsers. Keys match your deposit schema table names.
 * Validators run before every `put`, `putAll`, and inside `update`/`upsert`.
 */
export type TableValidators<S extends AnySchema> = {
  [K in keyof S]?: RecordParser<RecordOf<S, K>>;
};
