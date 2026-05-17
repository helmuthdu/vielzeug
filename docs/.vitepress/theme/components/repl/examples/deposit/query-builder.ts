export const queryBuilderExample = {
  code: `import { createLocalStorage, table } from '@vielzeug/deposit'

const schema = {
  products: table('id'),
}

const db = createLocalStorage('shop', schema)

await db.putAll('products', [
  { id: 1, name: 'Laptop', price: 999, category: 'electronics', inStock: true },
  { id: 2, name: 'Mouse', price: 29, category: 'electronics', inStock: true },
  { id: 3, name: 'Desk', price: 299, category: 'furniture', inStock: false },
  { id: 4, name: 'Chair', price: 199, category: 'furniture', inStock: true },
  { id: 5, name: 'Monitor', price: 399, category: 'electronics', inStock: true },
])

const affordable = await db
  .query('products')
  .equals('category', 'electronics')
  .filter((product) => product.inStock)
  .between('price', 0, 500)
  .orderBy('price', 'asc')
  .toArray()

console.log('Affordable electronics in stock:', affordable.map((product) => product.name))
console.log('Matching count:', await db.query('products').equals('category', 'electronics').count())`,
  name: 'Query Builder - Advanced Queries',
};
