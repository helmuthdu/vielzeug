type Predicate<T> = (value: T, index: number, array: T[]) => boolean;
type QueryOp<T> = { apply: (data: T[]) => T[] };
type ComparableFieldKeys<T extends Record<string, unknown>> = {
  [K in keyof T]-?: Extract<NonNullable<T[K]>, number | string> extends never ? never : K;
}[keyof T];

export type QueryContext<T extends Record<string, unknown>> = {
  deleteMany?: (records: T[]) => Promise<number>;
  source: () => Promise<T[]>;
};

/* -------------------- Public interfaces -------------------- */

export interface ReadQuery<T extends Record<string, unknown>> {
  between<K extends ComparableFieldKeys<T>>(
    field: K,
    lower: Extract<NonNullable<T[K]>, number | string>,
    upper: Extract<NonNullable<T[K]>, number | string>,
  ): ReadQuery<T>;
  count(): Promise<number>;
  equals<K extends keyof T>(field: K, value: T[K]): ReadQuery<T>;
  filter(fn: Predicate<T>): ReadQuery<T>;
  first(): Promise<T | undefined>;
  limit(n: number): ReadQuery<T>;
  offset(n: number): ReadQuery<T>;
  orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): ReadQuery<T>;
  startsWith<K extends keyof T>(field: K, prefix: string, options?: { ignoreCase?: boolean }): ReadQuery<T>;
  toArray(): Promise<T[]>;
}

/** Extends ReadQuery with delete(). Available on both Adapter.query() and inside batch() callbacks. */
export interface QueryBuilder<T extends Record<string, unknown>> extends ReadQuery<T> {
  between<K extends ComparableFieldKeys<T>>(
    field: K,
    lower: Extract<NonNullable<T[K]>, number | string>,
    upper: Extract<NonNullable<T[K]>, number | string>,
  ): QueryBuilder<T>;
  equals<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T>;
  filter(fn: Predicate<T>): QueryBuilder<T>;
  limit(n: number): QueryBuilder<T>;
  offset(n: number): QueryBuilder<T>;
  orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): QueryBuilder<T>;
  startsWith<K extends keyof T>(field: K, prefix: string, options?: { ignoreCase?: boolean }): QueryBuilder<T>;
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
      return append({
        apply: (data) =>
          data.filter((r) => {
            const v = r[field] as number | string;

            return v >= lower && v <= upper;
          }),
      });
    },
    count(): Promise<number> {
      return applyOps(ctx, ops).then((r) => r.length);
    },
    async delete(): Promise<number> {
      if (!ctx.deleteMany) {
        throw new Error('[deposit] query.delete is not available for this adapter context');
      }

      const records = await applyOps(ctx, ops);

      return ctx.deleteMany(records);
    },
    equals(field, value) {
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

      return append({ apply: (data) => data.slice(0, safeN) });
    },
    offset(n) {
      const safeN = assertNonNegativeInteger(n, 'query.offset');

      return append({ apply: (data) => data.slice(safeN) });
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
