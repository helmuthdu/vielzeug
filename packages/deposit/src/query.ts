type Predicate<T> = (value: T, index: number, array: T[]) => boolean;
type QueryOp<T> = { apply: (data: T[]) => T[] };
type ComparableFieldKeys<T extends Record<string, unknown>> = {
  [K in keyof T]-?: Extract<NonNullable<T[K]>, number | string> extends never ? never : K;
}[keyof T];

type QueryContext<T extends Record<string, unknown>> = {
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

/** Extends ReadQuery with delete(). Only available on Adapter.query(), not inside transactions. */
export interface QueryBuilder<T extends Record<string, unknown>> extends ReadQuery<T> {
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

/* -------------------- Single shared builder implementation (no duplication) -------------------- */

function buildQueryOps<T extends Record<string, unknown>, Q>(
  ctx: QueryContext<T>,
  ops: readonly QueryOp<T>[],
  rebuild: (ops: readonly QueryOp<T>[]) => Q,
) {
  const append = (op: QueryOp<T>): Q => rebuild([...ops, op]);

  return {
    between<K extends ComparableFieldKeys<T>>(
      field: K,
      lower: Extract<NonNullable<T[K]>, number | string>,
      upper: Extract<NonNullable<T[K]>, number | string>,
    ): Q {
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
    equals<K extends keyof T>(field: K, value: T[K]): Q {
      return append({ apply: (data) => data.filter((r) => r[field] === value) });
    },
    filter(fn: Predicate<T>): Q {
      return append({ apply: (data) => data.filter(fn) });
    },
    first(): Promise<T | undefined> {
      return applyOps(ctx, ops).then((r) => r[0]);
    },
    limit(n: number): Q {
      const safeN = assertNonNegativeInteger(n, 'query.limit');

      return append({ apply: (data) => data.slice(0, safeN) });
    },
    offset(n: number): Q {
      const safeN = assertNonNegativeInteger(n, 'query.offset');

      return append({ apply: (data) => data.slice(safeN) });
    },
    orderBy<K extends keyof T>(field: K, direction: 'asc' | 'desc' = 'asc'): Q {
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
    startsWith<K extends keyof T>(field: K, prefix: string, { ignoreCase = false }: { ignoreCase?: boolean } = {}): Q {
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

/* -------------------- Factory functions -------------------- */

export function createQueryBuilder<T extends Record<string, unknown>>(
  ctx: QueryContext<T>,
  ops: readonly QueryOp<T>[] = [],
): QueryBuilder<T> {
  function rebuild(newOps: readonly QueryOp<T>[]): QueryBuilder<T> {
    return createQueryBuilder(ctx, newOps);
  }

  const base = buildQueryOps(ctx, ops, rebuild);

  return {
    ...base,
    async delete(): Promise<number> {
      if (!ctx.deleteMany) {
        throw new Error('[deposit] query.delete is not available for this adapter context');
      }

      const records = await applyOps(ctx, ops);

      return ctx.deleteMany(records);
    },
  };
}

export function createReadQuery<T extends Record<string, unknown>>(
  ctx: Pick<QueryContext<T>, 'source'>,
  ops: readonly QueryOp<T>[] = [],
): ReadQuery<T> {
  function rebuild(newOps: readonly QueryOp<T>[]): ReadQuery<T> {
    return createReadQuery(ctx, newOps);
  }

  return buildQueryOps(ctx as QueryContext<T>, ops, rebuild) as ReadQuery<T>;
}
