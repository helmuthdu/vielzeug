export const arraySortCriteriaExample = {
  code: `import { sort } from '@vielzeug/arsenal'

const rows = [
  { address: { city: 'Berlin' }, age: 41, name: 'Ada' },
  { address: { city: 'Aachen' }, age: 30, name: 'Grace' },
  { address: { city: 'Berlin' }, age: 27, name: 'Linus' },
]

// A grid hands over ordered column paths, each with a direction
const ordered = sort(rows, [{ key: 'address.city' }, { key: 'age', direction: 'desc' }])
console.log('City asc, then age desc:', ordered.map((row) => \`\${row.name} (\${row.address.city})\`))

// Selector form for one extracted value
console.log('By name:', sort(rows, (row) => row.name).map((row) => row.name))

// Selectors form for a keyed object
console.log('By age desc:', sort(rows, { age: 'desc' }).map((row) => row.age))`,
  name: 'sort - Selector, selectors, or grid criteria',
};
