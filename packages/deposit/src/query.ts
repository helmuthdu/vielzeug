type Predicate<T> = (value: T, index: number, array: T[]) => boolean;

/* -------------------- QueryBuilder -------------------- */

export class QueryBuilder<T extends Record<string, unknown>> {
  private readonly source: () => Promise<unknown[]>;
  private readonly ops: ReadonlyArray<(data: unknown[]) => unknown[]>;

  /**
   * @internal — obtain a QueryBuilder via `adapter.from(table)`, not by constructing directly.
   */
  constructor(source: () => Promise<unknown[]>, ops: ReadonlyArray<(data: unknown[]) => unknown[]> = []) {
    this.source = source;
    this.ops = ops;
  }

  private async run(): Promise<T[]> {
    let data: unknown[] = await this.source();

    for (const op of this.ops) data = op(data);

    return data as T[];
  }

  async toArray(): Promise<T[]> {
    return this.run();
  }

  async count(): Promise<number> {
    return (await this.run()).length;
  }

  private clone(op: (data: T[]) => T[]): QueryBuilder<T> {
    return new QueryBuilder<T>(this.source, [...this.ops, op as (data: unknown[]) => unknown[]]);
  }

  equals<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T> {
    return this.clone((data) => data.filter((r) => r[field] === value));
  }

  between<K extends keyof T>(
    field: K,
    lower: T[K] extends number | string ? T[K] : never,
    upper: T[K] extends number | string ? T[K] : never,
  ): QueryBuilder<T> {
    return this.clone((data) =>
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

    return this.clone((data) =>
      data.filter((r) => {
        const value = r[field];

        if (typeof value !== 'string') return false;

        const str = ignoreCase ? value.toLowerCase() : value;

        return str.startsWith(lowerPrefix);
      }),
    );
  }

  filter(fn: Predicate<T>): QueryBuilder<T> {
    return this.clone((data) => data.filter(fn));
  }

  orderBy<K extends keyof T>(field: K, direction: 'asc' | 'desc' = 'asc'): QueryBuilder<T> {
    return this.clone((data) => {
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
    return this.clone((data) => data.slice(0, n));
  }

  offset(n: number): QueryBuilder<T> {
    return this.clone((data) => data.slice(n));
  }
}
