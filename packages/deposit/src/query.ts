type Predicate<T> = (value: T, index: number, array: T[]) => boolean;
type QueryOpKind = 'filter' | 'page' | 'sort';
type QueryOp<T> = {
  kind: QueryOpKind;
  run: (data: T[]) => T[];
};

/* -------------------- QueryBuilder -------------------- */

export interface QueryBuilder<T extends Record<string, unknown>> {
  between<K extends keyof T>(
    field: K,
    lower: NonNullable<T[K]> extends number | string ? NonNullable<T[K]> : never,
    upper: NonNullable<T[K]> extends number | string ? NonNullable<T[K]> : never,
  ): QueryBuilder<T>;
  count(): Promise<number>;
  equals<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T>;
  filter(fn: Predicate<T>): QueryBuilder<T>;
  first(): Promise<T | undefined>;
  limit(n: number): QueryBuilder<T>;
  offset(n: number): QueryBuilder<T>;
  orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): QueryBuilder<T>;
  startsWith<K extends keyof T>(field: K, prefix: string, options?: { ignoreCase?: boolean }): QueryBuilder<T>;
  toArray(): Promise<T[]>;
}

async function applyOps<T extends Record<string, unknown>>(
  source: () => Promise<unknown[]>,
  ops: ReadonlyArray<QueryOp<T>>,
  options: { includePageOps: boolean; includeSortOps: boolean },
): Promise<T[]> {
  let data = (await source()) as T[];

  for (const op of ops) {
    if (!options.includePageOps && op.kind === 'page') continue;

    if (!options.includeSortOps && op.kind === 'sort') continue;

    data = op.run(data);
  }

  return data;
}

function assertNonNegativeInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`deposit: ${name} must be a non-negative integer`);
  }

  return value;
}

function createClone<T extends Record<string, unknown>>(
  source: () => Promise<unknown[]>,
  ops: ReadonlyArray<QueryOp<T>>,
): QueryBuilder<T> {
  const clone = (kind: QueryOpKind, run: (data: T[]) => T[]): QueryBuilder<T> =>
    createQueryBuilder(source, [...ops, { kind, run }]);

  return {
    between<K extends keyof T>(
      field: K,
      lower: NonNullable<T[K]> extends number | string ? NonNullable<T[K]> : never,
      upper: NonNullable<T[K]> extends number | string ? NonNullable<T[K]> : never,
    ): QueryBuilder<T> {
      return clone('filter', (data) =>
        data.filter((record) => {
          const value = record[field] as number | string;

          return value >= lower && value <= upper;
        }),
      );
    },
    count(): Promise<number> {
      return applyOps(source, ops, { includePageOps: false, includeSortOps: false }).then((records) => records.length);
    },
    equals<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T> {
      return clone('filter', (data) => data.filter((record) => record[field] === value));
    },
    filter(fn: Predicate<T>): QueryBuilder<T> {
      return clone('filter', (data) => data.filter(fn));
    },
    first(): Promise<T | undefined> {
      return applyOps(source, ops, { includePageOps: true, includeSortOps: true }).then((records) => records[0]);
    },
    limit(n: number): QueryBuilder<T> {
      const safeN = assertNonNegativeInteger(n, 'query.limit');

      return clone('page', (data) => data.slice(0, safeN));
    },
    offset(n: number): QueryBuilder<T> {
      const safeN = assertNonNegativeInteger(n, 'query.offset');

      return clone('page', (data) => data.slice(safeN));
    },
    orderBy<K extends keyof T>(field: K, direction: 'asc' | 'desc' = 'asc'): QueryBuilder<T> {
      return clone('sort', (data) => {
        const sign = direction === 'asc' ? 1 : -1;

        return [...data].sort((left, right) => {
          const a = left[field] as number | string;
          const b = right[field] as number | string;

          if (a === b) return 0;

          return a > b ? sign : -sign;
        });
      });
    },
    startsWith<K extends keyof T>(
      field: K,
      prefix: string,
      { ignoreCase = false }: { ignoreCase?: boolean } = {},
    ): QueryBuilder<T> {
      const needle = ignoreCase ? prefix.toLowerCase() : prefix;

      return clone('filter', (data) =>
        data.filter((record) => {
          const value = record[field];

          if (typeof value !== 'string') return false;

          const haystack = ignoreCase ? value.toLowerCase() : value;

          return haystack.startsWith(needle);
        }),
      );
    },
    toArray(): Promise<T[]> {
      return applyOps(source, ops, { includePageOps: true, includeSortOps: true });
    },
  };
}

export function createQueryBuilder<T extends Record<string, unknown>>(
  source: () => Promise<unknown[]>,
  ops: ReadonlyArray<QueryOp<T>> = [],
): QueryBuilder<T> {
  return createClone(source, ops);
}
