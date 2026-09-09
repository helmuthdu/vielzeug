export const bulkOperationsExample = {
  code: `import { s } from '@vielzeug/spell'
import { table } from '@vielzeug/vault'
import { createLocalStorage } from '@vielzeug/vault/local-storage'

const ItemSchema = s.object({ id: s.number(), value: s.number() })
const schema = {
  items: table('id'),
}

const db = createLocalStorage({
  name: 'bulk-demo',
  schema,
  codecs: { items: ItemSchema },
})

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

// filter-driven removal: getAll + filter + deleteMany
const remaining = await db.getAll('items')
const toDelete = remaining.filter((item) => item.id <= 6).map((item) => item.id)
const queryDeleted = await db.deleteMany('items', toDelete)
console.log('Deleted items with id ≤ 6:', queryDeleted)

console.log('Remaining count:', await db.count('items'))
console.log('First remaining item:', (await db.getAll('items')).sort((a, b) => a.id - b.id)[0])`,
  name: 'Bulk Operations',
};
