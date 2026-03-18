import { type Predicate, search, sort } from '@vielzeug/toolkit';

/* -------------------- Executable base -------------------- */

/**
 * Shared base for `QueryBuilder` and `ProjectedQuery`.
 * Provides all terminal methods so they don't need to be duplicated.
 */
abstract class Executable<T> {
  protected abstract execute(): Promise<T[]>;

  async toArray(): Promise<T[]> {
    return this.execute();
  }

  async first(): Promise<T | undefined> {
    return (await this.execute())[0];
  }

  async last(): Promise<T | undefined> {
    const arr = await this.execute();

    return arr[arr.length - 1];
  }

  async count(): Promise<number> {
    return (await this.execute()).length;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    for (const item of await this.execute()) yield item;
  }
}

/* -------------------- ProjectedQuery -------------------- */

/**
 * Terminal result of a `QueryBuilder.map()` projection.
 * Supports the same terminal methods as `QueryBuilder` but is not further chainable,
 * since the record type may no longer be an object (e.g. `map(u => u.name)` yields `string`).
 */
export class ProjectedQuery<U> extends Executable<U> {
  private readonly source: () => Promise<U[]>;

  constructor(source: () => Promise<U[]>) {
    super();
    this.source = source;
  }

  protected execute(): Promise<U[]> {
    return this.source();
  }
}

/* -------------------- QueryBuilder -------------------- */

export class QueryBuilder<T extends Record<string, unknown>> extends Executable<T> {
  private readonly operations: ReadonlyArray<(data: unknown[]) => unknown[]>;
  private readonly adapter: { getAll(table: string): Promise<unknown[]> };
  private readonly table: string;

  /**
   * @internal — obtain a QueryBuilder via `adapter.from(table)`, not by constructing directly.
   */
  constructor(
    adapter: { getAll(table: string): Promise<unknown[]> },
    table: string,
    operations: ReadonlyArray<(data: unknown[]) => unknown[]> = [],
  ) {
    super();
    this.adapter = adapter;
    this.table = table;
    this.operations = operations;
  }

  protected execute(): Promise<T[]> {
    return this.toArray_impl();
  }

  private toArray_impl(): Promise<T[]> {
    return this.adapter.getAll(this.table).then((data) => {
      let result: unknown[] = data;

      for (const op of this.operations) result = op(result);

      return result as T[];
    });
  }

  private clone(op: (data: T[]) => T[]): QueryBuilder<T> {
    return new QueryBuilder<T>(this.adapter, this.table, [...this.operations, op as (data: unknown[]) => unknown[]]);
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
    return this.clone((data) => sort(data, { [field]: direction } as Partial<Record<keyof T, 'asc' | 'desc'>>) as T[]);
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

  /**
   * Projects each record to a new value.
   * Returns a `ProjectedQuery<U>` rather than a `QueryBuilder`, since the result
   * type may not be a plain object (e.g. `map(u => u.name)` yields `string`).
   */
  map<U>(callback: (record: T) => U): ProjectedQuery<U> {
    const ops = [...this.operations, (data: unknown[]) => (data as T[]).map(callback)];

    return new ProjectedQuery<U>(async () => {
      let data: unknown[] = await this.adapter.getAll(this.table);

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
    return this.clone((data) => search(data, query, tone) as T[]);
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

  async reduce<A>(fn: (acc: A, record: T) => A, initial: A): Promise<A> {
    return (await this.toArray()).reduce(fn, initial);
  }

  /**
   * Returns the number of records after all pipeline operations are applied.
   * Note: `limit`, `offset`, and `page` affect this count — use them after calling `count()`
   * if you need a total match count independent of pagination.
   */
  override async count(): Promise<number> {
    return (await this.toArray()).length;
  }

  async toArray(): Promise<T[]> {
    return this.toArray_impl();
  }
}
