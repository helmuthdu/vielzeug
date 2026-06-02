import { VaultError } from './errors';

type Predicate<T> = (value: T, index: number, array: T[]) => boolean;
/**
 * `isNonFilter`: when true this op is excluded from `totalCount()` — it does not restrict
 * *which* records match (limit, offset, orderBy), only how results are presented.
 */
type QueryOp<T> = { apply: (data: T[]) => T[]; isNonFilter?: boolean };
type ComparableFieldKeys<T extends Record<string, unknown>> = {
  [K in keyof T]-?: Extract<NonNullable<T[K]>, number | string> extends never ? never : K;
}[keyof T];

/**
 * A primary-key range hint that can be pushed down to native storage backends (e.g. IndexedDB).
 * When `QueryContext.getRange` and `keyField` are present, a matching first filter op replaces
 * the full-table `source()` scan with a targeted range fetch.
 */
export type NativeRange =
  | { type: 'eq'; value: unknown }
  | { lower: unknown; type: 'between'; upper: unknown }
  | { prefix: string; type: 'starts' };

export type QueryContext<T extends Record<string, unknown>> = {
  deleteMany?: (records: T[]) => Promise<number>;
  /**
   * When present alongside `indexedFields`, replaces `source()` for secondary-index filter ops.
   * Only activated when the first op is `equals`, `between`, or `startsWith` on a field that
   * has an index registered in the schema. IndexedDB uses `IDBIndex.getAll(range)` under the hood.
   */
  getIndexRange?: (field: string, range: NativeRange) => Promise<T[]>;
  /**
   * When present alongside `keyField`, replaces `source()` for primary-key filter ops.
   * Only activated when the first op is an `equals`, `between`, or case-sensitive `startsWith`
   * on `keyField`. All remaining ops still run in-memory against the range result.
   */
  getRange?: (range: NativeRange) => Promise<T[]>;
  /** Fields that have secondary indexes — used to detect when a filter op can use `getIndexRange`. */
  indexedFields?: ReadonlySet<string>;
  /** Primary key field name — used to detect when a filter op can be pushed to `getRange`. */
  keyField?: string;
  source: () => Promise<T[]>;
};

/* -------------------- Public interfaces -------------------- */

/**
 * Shared query methods. `T` is the base record type; `N` is the progressively-narrowed type
 * accumulated by `equals()` calls.
 */
type ChainedQuery<T extends Record<string, unknown>, N extends T, Self extends ChainedQuery<T, N, Self>> = {
  /**
   * Filter records where `field` is between `lower` and `upper` (inclusive).
   * Preserves any type narrowing already accumulated by prior `equals()` calls.
   */
  between<K extends ComparableFieldKeys<T>>(
    field: K,
    lower: Extract<NonNullable<T[K]>, number | string>,
    upper: Extract<NonNullable<T[K]>, number | string>,
  ): QueryBuilder<T, N>;
  /**
   * Returns the number of records matching all applied operations, including `limit` and `offset`.
   * To get the full filtered set size regardless of pagination (e.g. for "page X of N" UIs),
   * use `totalCount()` instead.
   */
  count(): Promise<number>;
  /**
   * Filter records where `field` exactly equals `value`.
   * The return type is narrowed to `QueryBuilder<T & Record<K, V>>` so that subsequent
   * `.toArray()`, `.first()`, etc. reflect the equality constraint in their result type.
   *
   * ```ts
   * // result: (User & { role: 'admin' })[]
   * const admins = await db.query('users').equals('role', 'admin').toArray();
   * ```
   */
  equals<K extends keyof T & string, V extends T[K]>(field: K, value: V): QueryBuilder<T & Record<K, V>>;
  filter(fn: Predicate<N>): Self;
  first(): Promise<N | undefined>;
  limit(n: number): Self;
  offset(n: number): Self;
  orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): Self;
  /**
   * Filter records where `field` starts with `prefix`.
   * Preserves any type narrowing already accumulated by prior `equals()` calls.
   */
  startsWith<K extends keyof T>(field: K, prefix: string, options?: { ignoreCase?: boolean }): QueryBuilder<T, N>;
  toArray(): Promise<N[]>;
  /**
   * Returns the number of records matching the applied filter predicates.
   * Presentation-only ops (`limit`, `offset`, `orderBy`) are intentionally ignored — this
   * always counts the full filtered set, making paginated total-count queries possible
   * without a second query.
   */
  totalCount(): Promise<number>;
};

/** Extends the shared query API with `delete()`. Available on both `Adapter.query()` and inside `batch()` callbacks. */
export interface QueryBuilder<T extends Record<string, unknown>, N extends T = T> extends ChainedQuery<
  T,
  N,
  QueryBuilder<T, N>
> {
  delete(): Promise<number>;
}

/* -------------------- Helpers -------------------- */

async function applyOps<T extends Record<string, unknown>>(
  ctx: QueryContext<T>,
  ops: readonly QueryOp<T>[],
): Promise<T[]> {
  let data = await ctx.source();

  for (const op of ops) {
    data = op.apply(data);
  }

  return data;
}

function assertNonNegativeInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new VaultError(`${name} must be a non-negative integer`);
  }

  return value;
}

/* -------------------- Push-down helpers -------------------- */

/** Build a new QueryContext with source replaced by a range/index fetch. Drops range hints since push-down is done. */
function pushDownContext<T extends Record<string, unknown>>(
  ctx: QueryContext<T>,
  newSource: () => Promise<T[]>,
): QueryContext<T> {
  return { deleteMany: ctx.deleteMany, source: newSource };
}

/* -------------------- Factory -------------------- */

export function createQueryBuilder<T extends Record<string, unknown>, N extends T = T>(
  ctx: QueryContext<T>,
  ops: readonly QueryOp<T>[] = [],
): QueryBuilder<T, N> {
  const append = (op: QueryOp<T>): QueryBuilder<T, N> => createQueryBuilder<T, N>(ctx, [...ops, op]);

  return {
    between(field, lower, upper) {
      const fieldStr = String(field);

      if (ops.length === 0) {
        if (ctx.getRange && ctx.keyField === fieldStr) {
          return createQueryBuilder(
            pushDownContext(ctx, () => ctx.getRange!({ lower, type: 'between', upper })),
            ops,
          );
        }

        if (ctx.getIndexRange && ctx.indexedFields?.has(fieldStr)) {
          return createQueryBuilder(
            pushDownContext(ctx, () => ctx.getIndexRange!(fieldStr, { lower, type: 'between', upper })),
            ops,
          );
        }
      }

      return append({
        apply: (data) =>
          data.filter((r) => {
            const v = r[field] as number | string;

            return v >= lower && v <= upper;
          }),
      }) as unknown as QueryBuilder<T, N>;
    },
    count(): Promise<number> {
      return applyOps(ctx, ops).then((r) => r.length);
    },
    async delete(): Promise<number> {
      if (!ctx.deleteMany) {
        throw new VaultError('query.delete is not available for this adapter context');
      }

      const records = await applyOps(ctx, ops);

      return ctx.deleteMany(records);
    },
    equals<K extends keyof T & string, V extends T[K]>(field: K, value: V): QueryBuilder<T & Record<K, V>> {
      const fieldStr = String(field);

      if (ops.length === 0) {
        if (ctx.getRange && ctx.keyField === fieldStr) {
          return createQueryBuilder<T & Record<K, V>>(
            pushDownContext(
              ctx as unknown as QueryContext<T & Record<K, V>>,
              () => ctx.getRange!({ type: 'eq', value }) as Promise<(T & Record<K, V>)[]>,
            ),
          ) as QueryBuilder<T & Record<K, V>>;
        }

        if (ctx.getIndexRange && ctx.indexedFields?.has(fieldStr)) {
          return createQueryBuilder<T & Record<K, V>>(
            pushDownContext(
              ctx as unknown as QueryContext<T & Record<K, V>>,
              () => ctx.getIndexRange!(fieldStr, { type: 'eq', value }) as Promise<(T & Record<K, V>)[]>,
            ),
          ) as QueryBuilder<T & Record<K, V>>;
        }
      }

      return createQueryBuilder<T & Record<K, V>>(ctx as unknown as QueryContext<T & Record<K, V>>, [
        { apply: (data) => data.filter((r) => r[field] === value) as (T & Record<K, V>)[] },
        ...(ops as unknown as QueryOp<T & Record<K, V>>[]),
      ]);
    },
    filter(fn) {
      return append({ apply: (data) => data.filter(fn as Predicate<T>) });
    },
    first(): Promise<N | undefined> {
      if (ops.length === 0) return ctx.source().then((r) => r[0] as N | undefined);

      return applyOps(ctx, ops).then((r) => r[0] as N | undefined);
    },
    limit(n) {
      const safeN = assertNonNegativeInteger(n, 'query.limit');

      return append({ apply: (data) => data.slice(0, safeN), isNonFilter: true });
    },
    offset(n) {
      const safeN = assertNonNegativeInteger(n, 'query.offset');

      return append({ apply: (data) => data.slice(safeN), isNonFilter: true });
    },
    orderBy(field, direction = 'asc') {
      return append({
        apply: (data) => {
          const sign = direction === 'asc' ? 1 : -1;

          return [...data].sort((a, b) => {
            const av = a[field] as number | string;
            const bv = b[field] as number | string;

            if (av === bv) return 0;

            return av > bv ? sign : -sign;
          });
        },
        isNonFilter: true,
      });
    },
    startsWith(field, prefix, { ignoreCase = false } = {}) {
      const fieldStr = String(field);

      if (!ignoreCase && prefix.length > 0 && ops.length === 0) {
        if (ctx.getRange && ctx.keyField === fieldStr) {
          return createQueryBuilder(
            pushDownContext(ctx, () => ctx.getRange!({ prefix, type: 'starts' })),
            ops,
          );
        }

        if (ctx.getIndexRange && ctx.indexedFields?.has(fieldStr)) {
          return createQueryBuilder(
            pushDownContext(ctx, () => ctx.getIndexRange!(fieldStr, { prefix, type: 'starts' })),
            ops,
          );
        }
      }

      const needle = ignoreCase ? prefix.toLowerCase() : prefix;

      return append({
        apply: (data) =>
          data.filter((r) => {
            const v = r[field];

            if (typeof v !== 'string') return false;

            const haystack = ignoreCase ? v.toLowerCase() : v;

            return haystack.startsWith(needle);
          }),
      }) as unknown as QueryBuilder<T, N>;
    },
    toArray(): Promise<N[]> {
      return applyOps(ctx, ops) as Promise<N[]>;
    },
    totalCount(): Promise<number> {
      const filterOps = ops.filter((op) => !op.isNonFilter);

      return applyOps(ctx, filterOps).then((r) => r.length);
    },
  };
}
