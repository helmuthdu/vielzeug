export const operatorsExample = {
  code: `// Build a typed transformation pipeline with filter, map, and scan.
import { toArray, filter, map, of, pipe, scan } from '@vielzeug/flux'

const result = pipe(
  of(1, 2, 3, 4, 5),
  filter((value) => value % 2 !== 0),
  map((value) => value * 10),
  scan((total, value) => total + value, 0),
)

toArray(result, { maxItems: 3 })
  .then((values) => console.log('running totals:', values))
  .catch(console.error)`,
  name: 'Operators',
};
