export const queryBuilderExample = {
  code: `import { createLocalStorage, table } from '@vielzeug/deposit'

const schema = {
  products: table('id'),
}

const db = createLocalStorage({ name: 'shop', schema })

await db.putAll('products', [
  { id: 1, name: 'Laptop', price: 999, category: 'electronics', inStock: true },
  { id: 2, name: 'Mouse', price: 29, category: 'electronics', inStock: true },
  { id: 3, name: 'Desk', price: 299, category: 'furniture', inStock: false },
  { id: 4, name: 'Chair', price: 199, category: 'furniture', inStock: true },
  { id: 5, name: 'Monitor', price: 399, category: 'electronics', inStock: true },
])

const pageSize = 2
const pageIndex = 0

// Build a base query — reuse it for both the page slice and the total count
const q = db
  .query('products')
  .equals('category', 'electronics')
  .filter((p) => p.inStock)
  .orderBy('price', 'asc')

// count() respects limit/offset — returns records in the current page
const page = await q.limit(pageSize).offset(pageIndex * pageSize).toArray()
const pageCount = await q.limit(pageSize).offset(pageIndex * pageSize).count()

// totalCount() ignores limit/offset/orderBy — returns the full filtered set
const total = await q.totalCount()

console.log('Page:', page.map((p) => p.name))
console.log('Page count:', pageCount, '/ Total matching:', total)
console.log('Page 1 of', Math.ceil(total / pageSize))

// startsWith with case-insensitive flag
const mice = await db.query('products').startsWith('name', 'm', { ignoreCase: true }).toArray()
console.log('Starts with m:', mice.map((p) => p.name))

// predicate delete
const removed = await db.query('products').filter((p) => !p.inStock).delete()
console.log('Removed out-of-stock:', removed)

// first()
const cheapest = await db.query('products').orderBy('price', 'asc').first()
console.log('Cheapest:', cheapest?.name, cheapest?.price)`,
  name: 'Query Builder — Filters, Pagination, totalCount',
};
