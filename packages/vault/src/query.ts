import { VaultError } from './errors';

type Predicate<T> = (value: T, index: number, array: readonly T[]) => boolean;
type QueryOp<T> = { apply: (data: T[]) => T[]; isPresentation?: boolean };

export type QueryContext<T extends object> = {
  deleteMany?: (records: readonly T[]) => Promise<number>;
  source: () => Promise<T[]>;
};

export interface QueryBuilder<T extends object> {
  count(): Promise<number>;
  delete(): Promise<number>;
  equals<K extends keyof T & string>(field: K, value: T[K]): QueryBuilder<T>;
  filter(predicate: Predicate<T>): QueryBuilder<T>;
  first(): Promise<T | undefined>;
  limit(count: number): QueryBuilder<T>;
  offset(count: number): QueryBuilder<T>;
  orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): QueryBuilder<T>;
  toArray(): Promise<T[]>;
}

const applyOps = async <T extends object>(
  context: QueryContext<T>,
  operations: readonly QueryOp<T>[],
): Promise<T[]> => {
  let data = await context.source();
  for (const operation of operations) data = operation.apply(data);
  return data;
};

const nonNegativeInteger = (value: number, name: string): number => {
  if (!Number.isInteger(value) || value < 0) throw new VaultError(`${name} must be a non-negative integer`);
  return value;
};

export function createQueryBuilder<T extends object>(
  context: QueryContext<T>,
  operations: readonly QueryOp<T>[] = [],
): QueryBuilder<T> {
  const append = (operation: QueryOp<T>): QueryBuilder<T> => createQueryBuilder(context, [...operations, operation]);

  return {
    count: () =>
      applyOps(
        context,
        operations.filter((operation) => !operation.isPresentation),
      ).then((data) => data.length),
    async delete() {
      if (!context.deleteMany) throw new VaultError('query.delete is not available in this context');
      return context.deleteMany(await applyOps(context, operations));
    },
    equals: (field, value) => append({ apply: (data) => data.filter((record) => record[field] === value) }),
    filter: (predicate) => append({ apply: (data) => data.filter(predicate) }),
    async first() {
      return (await applyOps(context, operations))[0];
    },
    limit(count) {
      const safeCount = nonNegativeInteger(count, 'query.limit');
      return append({ apply: (data) => data.slice(0, safeCount), isPresentation: true });
    },
    offset(count) {
      const safeCount = nonNegativeInteger(count, 'query.offset');
      return append({ apply: (data) => data.slice(safeCount), isPresentation: true });
    },
    orderBy: (field, direction = 'asc') =>
      append({
        apply: (data) => {
          const sign = direction === 'asc' ? 1 : -1;
          return [...data].sort((left, right) => {
            const a = left[field] as number | string;
            const b = right[field] as number | string;
            return a === b ? 0 : a > b ? sign : -sign;
          });
        },
        isPresentation: true,
      }),
    toArray: () => applyOps(context, operations),
  };
}
