export const operatorsExample = {
  code: `import { of, map, filter, scan, startWith, bufferCount, pairwise, distinctUntilChanged } from '@vielzeug/flux'

// Transformation pipeline
of(1, 2, 3, 4, 5)
  .pipe(
    filter((n) => n % 2 !== 0),   // odd only
    map((n) => n * 10),            // scale up
    startWith(0),                  // prepend 0
  )
  .subscribe((v) => console.log('pipe:', v))
// pipe: 0  10  30  50

// Running total with scan
of(1, 2, 3, 4)
  .pipe(scan((acc, n) => acc + n, 0))
  .subscribe((v) => console.log('sum:', v))
// sum: 1  3  6  10

// Consecutive pairs
of('a', 'b', 'c', 'd')
  .pipe(pairwise())
  .subscribe((pair) => console.log('pair:', pair))
// pair: ['a','b']  ['b','c']  ['c','d']

// Fixed-size batches
of(1, 2, 3, 4, 5, 6)
  .pipe(bufferCount(2))
  .subscribe((buf) => console.log('batch:', buf))
// batch: [1,2]  [3,4]  [5,6]

// Deduplicate consecutive duplicates
of(1, 1, 2, 2, 3, 1)
  .pipe(distinctUntilChanged())
  .subscribe((v) => console.log('distinct:', v))
// distinct: 1  2  3  1`,
  name: 'Operators',
};
