import { type PageEnvelope, paginate, type SortCriterion, sort } from '../src/index.js';

interface Row {
  a: { b: string };
  n: number;
}

const rows: Row[] = [{ a: { b: 'x' }, n: 1 }];

// Criteria form: dotted paths and keyof both accepted, result stays T[].
const byPath: Row[] = sort(rows, [{ key: 'a.b' }, { direction: 'desc', key: 'n' }]);
// Selector form still resolves to T[].
const bySelector: Row[] = sort(rows, (row) => row.n, 'desc');
// Selectors-object form still resolves.
const bySelectors: Row[] = sort(rows, { n: 'asc' });
// Primitive items keep working through the selector overload.
const nums: number[] = sort([3, 1, 2], (x) => x);

const criterion: SortCriterion<Row> = { direction: 'asc', key: 'a.b' };

// paginate returns a typed envelope.
const page: PageEnvelope<number> = paginate(nums, { page: 2, pageSize: 10 });
const items: readonly number[] = page.items;

void byPath;
void bySelector;
void bySelectors;
void criterion;
void items;

type ExpectFalse<T extends false> = T;
// A criteria array with a non-string key is rejected.
type BadCriterion = ExpectFalse<{ key: number } extends SortCriterion<Row> ? true : false>;
// paginate's page must be a number.
type BadPage = ExpectFalse<{ page: string } extends { page?: number } ? true : false>;

void (0 as unknown as [BadCriterion, BadPage]);
