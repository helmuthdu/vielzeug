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

// getAll() returns a plain array: compose with standard array operations
const all = await db.getAll('products')
const electronics = all
  .filter((product) => product.category === 'electronics' && product.inStock)
  .sort((a, b) => a.price - b.price)

const pageSize = 2
const pageIndex = 0
const page = electronics.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)

console.log('Page:', page.map((p) => p.name))
console.log('Total matching:', electronics.length)
console.log('Page 1 of', Math.ceil(electronics.length / pageSize))

// prefix match
const mice = all.filter((product) => product.name.toLowerCase().startsWith('m'))
console.log('Starts with m:', mice.map((p) => p.name))

// deletion via deleteMany with the keys to remove
const outOfStock = all.filter((product) => !product.inStock).map((product) => product.id)
console.log('Removed out-of-stock:', await db.deleteMany('products', outOfStock))

const cheapest = (await db.getAll('products')).sort((a, b) => a.price - b.price)[0]
console.log('Cheapest:', cheapest?.name, cheapest?.price)

console.log('Remaining count:', await db.count('products'))`,
  name: 'Filtering: getAll composition, pagination, and deletion',
};
