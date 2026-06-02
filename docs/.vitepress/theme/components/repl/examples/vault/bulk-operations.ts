export const bulkOperationsExample = {
  code: `import { createLocalStorage, table } from '@vielzeug/vault'

const schema = {
  items: table('id'),
}

const db = createLocalStorage({ name: 'bulk-demo', schema })

const items = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  value: +(Math.random() * 1000).toFixed(2),
}))

await db.putAll('items', items)
console.log('Inserted', items.length, 'items')

// getMany — fetch multiple by key in one call (missing keys return undefined)
const [first, missing, third] = await db.getMany('items', [1, 99, 3])
console.log('getMany [1, 99, 3]:', first?.id, missing, third?.id)

// deleteMany — remove multiple by key, returns count deleted
const deleted = await db.deleteMany('items', [1, 2, 3, 99])
console.log('deleteMany [1,2,3,99] deleted:', deleted) // 3 (99 did not exist)

// query-based delete for filter-driven removal
const queryDeleted = await db.query('items').filter((item) => item.id <= 6).delete()
console.log('Query-deleted items with id ≤ 6:', queryDeleted)

console.log('Remaining count:', await db.query('items').count())
console.log('First remaining item:', await db.query('items').orderBy('id', 'asc').first())`,
  name: 'Bulk Operations',
};
