type Predicate<T> = (value: T, index: number, array: T[]) => boolean;

/* -------------------- ProjectedQuery -------------------- */

/**
 * Terminal result of a `QueryBuilder.map()` projection.
 * Supports the same terminal methods as `QueryBuilder` but is not further chainable,
 * since the record type may no longer be an object (e.g. `map(u => u.name)` yields `string`).
 */
export class ProjectedQuery<U> {
  private readonly src: () => Promise<U[]>;

  constructor(src: () => Promise<U[]>) {
    this.src = src;
  }

  toArray(): Promise<U[]> {
    return this.src();
  }

  async first(): Promise<U | undefined> {
    return (await this.src())[0];
  }

  async last(): Promise<U | undefined> {
    const arr = await this.src();

    return arr[arr.length - 1];
  }

  async count(): Promise<number> {
    return (await this.src()).length;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<U> {
    for (const item of await this.src()) yield item;
  }

  async reduce<A>(fn: (acc: A, item: U) => A, initial: A): Promise<A> {
    return (await this.src()).reduce(fn, initial);
  }
}

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

  async first(): Promise<T | undefined> {
    return (await this.run())[0];
  }

  async last(): Promise<T | undefined> {
    const arr = await this.run();

    return arr[arr.length - 1];
  }

  async count(): Promise<number> {
    return (await this.run()).length;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    for (const item of await this.run()) yield item;
  }

  async reduce<A>(fn: (acc: A, record: T) => A, initial: A): Promise<A> {
    return (await this.run()).reduce(fn, initial);
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

  and(...predicates: Predicate<T>[]): QueryBuilder<T> {
    return this.clone((data) => data.filter((r, i, a) => predicates.every((p) => p(r, i, a))));
  }

  or(...predicates: Predicate<T>[]): QueryBuilder<T> {
    return this.clone((data) => data.filter((r, i, a) => predicates.some((p) => p(r, i, a))));
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

  page(pageNumber: number, pageSize: number): QueryBuilder<T> {
    const start = (pageNumber - 1) * pageSize;

    return this.clone((data) => data.slice(start, start + pageSize));
  }

  reverse(): QueryBuilder<T> {
    return this.clone((data) => [...data].reverse());
  }

  map<U>(callback: (record: T) => U): ProjectedQuery<U> {
    const ops = [...this.ops, (data: unknown[]) => (data as T[]).map(callback)];
    const src = this.source;

    return new ProjectedQuery<U>(async () => {
      let data: unknown[] = await src();

      for (const op of ops) data = op(data);

      return data as U[];
    });
  }

  /**
   * Fuzzy full-text search across all string fields.
   * @param query The search string.
   * @param tone  Match threshold in [0, 1]. Lower = more permissive. Defaults to 0.25.
   */
  search(query: string, tone?: number): QueryBuilder<T> {
    void tone;

    const lq = query.toLowerCase();

    return this.clone((data) =>
      data.filter((r) => Object.values(r).some((v) => typeof v === 'string' && v.toLowerCase().includes(lq))),
    );
  }

  contains(query: string, fields?: (keyof T & string)[]): QueryBuilder<T> {
    const lq = query.toLowerCase();

    return this.clone((data) =>
      data.filter((r) => {
        const keys = fields ?? (Object.keys(r) as (keyof T & string)[]);

        return keys.some((f) => typeof r[f] === 'string' && (r[f] as string).toLowerCase().includes(lq));
      }),
    );
  }
}
