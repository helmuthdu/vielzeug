export const bulkOperationsExample = {
  code: `import { createLocalStorage, table } from '@vielzeug/deposit'

const schema = {
  items: table('id'),
}

const db = createLocalStorage('bulk-demo', schema)

const items = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  value: +(Math.random() * 1000).toFixed(2),
}))

await db.putAll('items', items)
console.log('Inserted', items.length, 'items')

const deleted = await db.deleteWhere('items', (item) => item.id <= 3)
console.log('Deleted items:', deleted)
console.log('Remaining count:', await db.count('items'))
console.log('First remaining item:', await db.query('items').orderBy('id', 'asc').first())`,
  name: 'Bulk Operations',
};
