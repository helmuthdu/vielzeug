export const filteringExample = {
  code: `import { s } from '@vielzeug/spell'
import { table } from '@vielzeug/vault'
import { createLocalStorage } from '@vielzeug/vault/local-storage'

const ProductSchema = s.object({ category: s.string(), id: s.number(), inStock: s.boolean(), name: s.string(), price: s.number() })
const schema = {
  products: table('id'),
}

const db = createLocalStorage({
  name: 'shop',
  schema,
  codecs: { products: ProductSchema },
})

await db.putAll('products', [
  { id: 1, name: 'Laptop', price: 999, category: 'electronics', inStock: true },
  { id: 2, name: 'Mouse', price: 29, category: 'electronics', inStock: true },
  { id: 3, name: 'Desk', price: 299, category: 'furniture', inStock: false },
  { id: 4, name: 'Chair', price: 199, category: 'furniture', inStock: true },
  { id: 5, name: 'Monitor', price: 399, category: 'electronics', inStock: true },
])

const products = db.query('products')
const electronics = products
  .filter((product) => product.category === 'electronics' && product.inStock)
  .orderBy('price')

const pageSize = 2
const pageIndex = 0
const page = await electronics.offset(pageIndex * pageSize).limit(pageSize).toArray()
const total = await electronics.count()

console.log('Page:', page.map((p) => p.name))
console.log('Total matching:', total)
console.log('Page 1 of', Math.ceil(total / pageSize))

// prefix match via filter
const mice = await products.filter((product) => product.name.toLowerCase().startsWith('m')).toArray()
console.log('Starts with m:', mice.map((p) => p.name))

const removed = await products.filter((product) => !product.inStock).delete()
console.log('Removed out-of-stock:', removed)

const cheapest = await products.orderBy('price').first()
console.log('Cheapest:', cheapest?.name, cheapest?.price)

console.log('Remaining count:', await db.count('products'))`,
  name: 'Filtering — fluent query, pagination, and deletion',
};
