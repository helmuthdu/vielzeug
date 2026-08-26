import { VaultError } from './errors';

type Predicate<T> = (value: T, index: number, array: T[]) => boolean;
/**
 * `isNonFilter`: when true this op is excluded from `count()` — it does not restrict
 * *which* records match (limit, offset, orderBy), only how results are presented.
 */
type QueryOp<T> = { apply: (data: T[]) => T[]; isNonFilter?: boolean };

export type QueryContext<T extends object> = {
  deleteMany?: (records: T[]) => Promise<number>;
  source: () => Promise<T[]>;
};

/* -------------------- Public interfaces -------------------- */

/**
 * Fluent query builder. `T` is the record type.
 */
export interface QueryBuilder<T extends object> {
  /**
   * Returns the number of records matching the applied filter predicates.
   * Presentation-only ops (`limit`, `offset`, `orderBy`) are intentionally ignored — this
   * always counts the full filtered set, making paginated total-count queries possible
   * without a second query.
   */
  count(): Promise<number>;
  delete(): Promise<number>;
  /**
   * Filter records where `field` exactly equals `value`.
   */
  equals<K extends keyof T & string, V extends T[K]>(field: K, value: V): QueryBuilder<T>;
  filter(fn: Predicate<T>): QueryBuilder<T>;
  first(): Promise<T | undefined>;
  limit(n: number): QueryBuilder<T>;
  offset(n: number): QueryBuilder<T>;
  orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): QueryBuilder<T>;
  toArray(): Promise<T[]>;
}

/* -------------------- Helpers -------------------- */

async function applyOps<T extends object>(ctx: QueryContext<T>, ops: readonly QueryOp<T>[]): Promise<T[]> {
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

/* -------------------- Factory -------------------- */

export function createQueryBuilder<T extends object>(
  ctx: QueryContext<T>,
  ops: readonly QueryOp<T>[] = [],
): QueryBuilder<T> {
  const append = (op: QueryOp<T>): QueryBuilder<T> => createQueryBuilder<T>(ctx, [...ops, op]);

  return {
    count(): Promise<number> {
      const filterOps = ops.filter((op) => !op.isNonFilter);

      return applyOps(ctx, filterOps).then((r) => r.length);
    },
    async delete(): Promise<number> {
      if (!ctx.deleteMany) {
        throw new VaultError('query.delete is not available for this adapter context');
      }

      const records = await applyOps(ctx, ops);

      return ctx.deleteMany(records);
    },
    equals<K extends keyof T & string, V extends T[K]>(field: K, value: V): QueryBuilder<T> {
      return append({ apply: (data) => data.filter((r) => r[field] === value) });
    },
    filter(fn) {
      return append({ apply: (data) => data.filter(fn) });
    },
    first(): Promise<T | undefined> {
      if (ops.length === 0) return ctx.source().then((r) => r[0]);

      return applyOps(ctx, ops).then((r) => r[0]);
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
    toArray(): Promise<T[]> {
      return applyOps(ctx, ops);
    },
  };
}
