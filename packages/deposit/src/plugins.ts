import type { AnySchema, RecordOf } from './types';

/**
 * Minimal logger interface satisfied structurally by `@vielzeug/logit` Logger.
 * Pass a logit Logger instance directly — no adapter needed:
 *
 * ```ts
 * import { createLogger } from '@vielzeug/logit';
 * const db = createMemory({ schema, logger: createLogger('db') });
 * ```
 *
 * Deposit only emits error-level logs, so a single logit-compatible `error`
 * method is enough.
 */
export interface DepositLogger {
  error(messageOrContext?: Record<string, unknown> | Error | string, message?: string): void;
}

/**
 * Minimal synchronous validator interface satisfied structurally by
 * `@vielzeug/validit` Schema.
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
 * Deposit requires synchronous validation because writes may execute inside a
 * live IndexedDB transaction. Any object with a `parse(value: unknown): T`
 * method works.
 */
export interface RecordValidator<T> {
  parse(value: unknown): T;
}

/**
 * Per-table record parsers. Keys match your deposit schema table names.
 * Validators run before every `put`, `putAll`, and inside `update`/`upsert`.
 */
export type TableValidators<S extends AnySchema> = {
  [K in keyof S]?: RecordValidator<RecordOf<S, K>>;
};
