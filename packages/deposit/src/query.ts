type Predicate<T> = (value: T, index: number, array: T[]) => boolean;
type QueryOp<T> = { apply: (data: T[]) => T[]; isPagination?: boolean };
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
   * When present alongside `keyField`, replaces `source()` for primary-key filter ops.
   * Only activated when the first op is an `equals`, `between`, or case-sensitive `startsWith`
   * on `keyField`. All remaining ops still run in-memory against the range result.
   */
  getRange?: (range: NativeRange) => Promise<T[]>;
  /** Primary key field name — used to detect when a filter op can be pushed to `getRange`. */
  keyField?: string;
  source: () => Promise<T[]>;
};

/* -------------------- Public interfaces -------------------- */

/** Shared query methods. `Self` is the concrete return type for chaining methods. */
type ChainedQuery<T extends Record<string, unknown>, Self> = {
  between<K extends ComparableFieldKeys<T>>(
    field: K,
    lower: Extract<NonNullable<T[K]>, number | string>,
    upper: Extract<NonNullable<T[K]>, number | string>,
  ): Self;
  /**
   * Returns the number of records matching the applied filter predicates.
   * Pagination ops (`limit`, `offset`) are intentionally ignored — this always
   * counts the full filtered set, making paginated total-count queries possible
   * without a second query.
   */
  count(): Promise<number>;
  equals<K extends keyof T>(field: K, value: T[K]): Self;
  filter(fn: Predicate<T>): Self;
  first(): Promise<T | undefined>;
  limit(n: number): Self;
  offset(n: number): Self;
  orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): Self;
  startsWith<K extends keyof T>(field: K, prefix: string, options?: { ignoreCase?: boolean }): Self;
  toArray(): Promise<T[]>;
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ReadQuery<T extends Record<string, unknown>> extends ChainedQuery<T, ReadQuery<T>> {}

/** Extends ReadQuery with delete(). Available on both Adapter.query() and inside batch() callbacks. */
export interface QueryBuilder<T extends Record<string, unknown>> extends ChainedQuery<T, QueryBuilder<T>> {
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
    throw new Error(`[deposit] ${name} must be a non-negative integer`);
  }

  return value;
}

/* -------------------- Factory -------------------- */

export function createQueryBuilder<T extends Record<string, unknown>>(
  ctx: QueryContext<T>,
  ops: readonly QueryOp<T>[] = [],
): QueryBuilder<T> {
  function rebuild(newOps: readonly QueryOp<T>[]): QueryBuilder<T> {
    return createQueryBuilder(ctx, newOps);
  }

  const append = (op: QueryOp<T>): QueryBuilder<T> => rebuild([...ops, op]);

  return {
    between(field, lower, upper) {
      if (ops.length === 0 && ctx.getRange && ctx.keyField !== undefined && String(field) === ctx.keyField) {
        const rangeSource = ctx.getRange;
        const newCtx: QueryContext<T> = {
          deleteMany: ctx.deleteMany,
          keyField: ctx.keyField,
          source: () => rangeSource({ lower, type: 'between', upper }),
        };

        return createQueryBuilder(newCtx, ops);
      }

      return append({
        apply: (data) =>
          data.filter((r) => {
            const v = r[field] as number | string;

            return v >= lower && v <= upper;
          }),
      });
    },
    count(): Promise<number> {
      // Pagination ops (limit/offset) are excluded — count reflects the full filtered set.
      const filterOps = ops.filter((op) => !op.isPagination);

      return applyOps(ctx, filterOps).then((r) => r.length);
    },
    async delete(): Promise<number> {
      if (!ctx.deleteMany) {
        throw new Error('[deposit] query.delete is not available for this adapter context');
      }

      const records = await applyOps(ctx, ops);

      return ctx.deleteMany(records);
    },
    equals(field, value) {
      if (ops.length === 0 && ctx.getRange && ctx.keyField !== undefined && String(field) === ctx.keyField) {
        const rangeSource = ctx.getRange;
        const newCtx: QueryContext<T> = {
          deleteMany: ctx.deleteMany,
          keyField: ctx.keyField,
          source: () => rangeSource({ type: 'eq', value }),
        };

        return createQueryBuilder(newCtx, ops);
      }

      return append({ apply: (data) => data.filter((r) => r[field] === value) });
    },
    filter(fn) {
      return append({ apply: (data) => data.filter(fn) });
    },
    first(): Promise<T | undefined> {
      return applyOps(ctx, ops).then((r) => r[0]);
    },
    limit(n) {
      const safeN = assertNonNegativeInteger(n, 'query.limit');

      return append({ apply: (data) => data.slice(0, safeN), isPagination: true });
    },
    offset(n) {
      const safeN = assertNonNegativeInteger(n, 'query.offset');

      return append({ apply: (data) => data.slice(safeN), isPagination: true });
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
      });
    },
    startsWith(field, prefix, { ignoreCase = false } = {}) {
      // Range push-down: only for case-sensitive, non-empty prefix on the primary key.
      // An empty prefix matches everything — fall through to in-memory (equivalent to source()).
      if (
        !ignoreCase &&
        prefix.length > 0 &&
        ops.length === 0 &&
        ctx.getRange &&
        ctx.keyField !== undefined &&
        String(field) === ctx.keyField
      ) {
        const rangeSource = ctx.getRange;
        const newCtx: QueryContext<T> = {
          deleteMany: ctx.deleteMany,
          keyField: ctx.keyField,
          source: () => rangeSource({ prefix, type: 'starts' }),
        };

        return createQueryBuilder(newCtx, ops);
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
      });
    },
    toArray(): Promise<T[]> {
      return applyOps(ctx, ops);
    },
  };
}
