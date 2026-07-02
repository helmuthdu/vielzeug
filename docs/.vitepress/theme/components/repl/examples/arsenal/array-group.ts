export const arrayGroupExample = {
  code: `import { groupBy } from '@vielzeug/arsenal'

const items = [
  { type: 'fruit', name: 'apple', price: 1.2 },
  { type: 'vegetable', name: 'carrot', price: 0.8 },
  { type: 'fruit', name: 'banana', price: 0.5 },
  { type: 'vegetable', name: 'broccoli', price: 1.5 },
  { type: 'fruit', name: 'orange', price: 0.9 }
]

const byType = groupBy(items, item => item.type)
console.log('Grouped by type:', byType)

const byPriceRange = groupBy(items, item =>
  item.price < 1 ? 'cheap' : 'expensive'
)
console.log('Grouped by price:', byPriceRange)`,
  name: 'groupBy - Group array by key',
};
