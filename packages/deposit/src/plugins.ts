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

/**
 * Minimal writable-signal interface satisfied structurally by
 * `@vielzeug/stateit` `Signal<T>` and `Store<T>`.
 * Pass a stateit signal directly — no adapter needed:
 *
 * ```ts
 * import { signal } from '@vielzeug/stateit';
 * const usersSignal = signal<User[]>([]);
 *
 * const db = createMemory({
 *   schema: { users: table<User>('id') },
 *   signals: { users: usersSignal },
 * });
 *
 * // usersSignal.value is now always in sync with the users table.
 * ```
 *
 * Any object with an `update(fn: (current: T) => T): void` method satisfies
 * this interface. Deposit calls `signal.update(() => snapshot)` on each change.
 */
export interface ReactiveSignal<T> {
  update(fn: (current: T) => T): void;
}

/**
 * Per-table reactive signals. Keys match your deposit schema table names.
 * Each signal is automatically kept in sync with the table via `observe()`.
 * Signals are wired at construction time and cleaned up on `dispose()`.
 */
export type TableSignals<S extends AnySchema> = {
  [K in keyof S]?: ReactiveSignal<RecordOf<S, K>[]>;
};
