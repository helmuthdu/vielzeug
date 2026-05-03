type Predicate<T> = (value: T, index: number, array: T[]) => boolean;
type QueryOpKind = 'filter' | 'page' | 'sort';
type QueryOp<T> = {
  kind: QueryOpKind;
  run: (data: T[]) => T[];
};

/* -------------------- QueryBuilder -------------------- */

export class QueryBuilder<T extends Record<string, unknown>> {
  private readonly source: () => Promise<unknown[]>;
  private readonly ops: ReadonlyArray<QueryOp<T>>;

  /**
   * @internal — obtain a QueryBuilder via `adapter.query(table)`, not by constructing directly.
   */
  constructor(source: () => Promise<unknown[]>, ops: ReadonlyArray<QueryOp<T>> = []) {
    this.source = source;
    this.ops = ops;
  }

  private async run(includePageOps = true): Promise<T[]> {
    let data: unknown[] = await this.source();

    for (const op of this.ops) {
      if (!includePageOps && op.kind === 'page') continue;

      data = op.run(data as T[]);
    }

    return data as T[];
  }

  async toArray(): Promise<T[]> {
    return this.run();
  }

  async count(): Promise<number> {
    return (await this.run(false)).length;
  }

  async first(): Promise<T | undefined> {
    return (await this.run())[0];
  }

  private clone(kind: QueryOpKind, run: (data: T[]) => T[]): QueryBuilder<T> {
    return new QueryBuilder<T>(this.source, [...this.ops, { kind, run }]);
  }

  equals<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T> {
    return this.clone('filter', (data) => data.filter((r) => r[field] === value));
  }

  between<K extends keyof T>(
    field: K,
    lower: NonNullable<T[K]> extends number | string ? NonNullable<T[K]> : never,
    upper: NonNullable<T[K]> extends number | string ? NonNullable<T[K]> : never,
  ): QueryBuilder<T> {
    return this.clone('filter', (data) =>
      data.filter((r) => {
        const val = r[field] as number | string;

        return val >= lower && val <= upper;
      }),
    );
  }

  startsWith<K extends keyof T>(
    field: K,
    prefix: string,
    { ignoreCase = false }: { ignoreCase?: boolean } = {},
  ): QueryBuilder<T> {
    const lowerPrefix = ignoreCase ? prefix.toLowerCase() : prefix;

    return this.clone('filter', (data) =>
      data.filter((r) => {
        const value = r[field];

        if (typeof value !== 'string') return false;

        const str = ignoreCase ? value.toLowerCase() : value;

        return str.startsWith(lowerPrefix);
      }),
    );
  }

  filter(fn: Predicate<T>): QueryBuilder<T> {
    return this.clone('filter', (data) => data.filter(fn));
  }

  orderBy<K extends keyof T>(field: K, direction: 'asc' | 'desc' = 'asc'): QueryBuilder<T> {
    return this.clone('sort', (data) => {
      const sign = direction === 'asc' ? 1 : -1;

      return [...data].sort((a, b) => {
        const av = a[field] as number | string;
        const bv = b[field] as number | string;

        if (av === bv) return 0;

        return av > bv ? sign : -sign;
      });
    });
  }

  limit(n: number): QueryBuilder<T> {
    return this.clone('page', (data) => data.slice(0, n));
  }

  offset(n: number): QueryBuilder<T> {
    return this.clone('page', (data) => data.slice(n));
  }
}
