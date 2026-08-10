export const incrementalUpdatesExample = {
  code: `import { createIndex } from '@vielzeug/scout'

const products = [
  { id: 1, title: 'Wireless Mouse',      price: 25 },
  { id: 2, title: 'Mechanical Keyboard', price: 80 },
  { id: 3, title: 'USB-C Hub',           price: 35 },
]

const index = createIndex(products, { fields: ['title'] })

// onMutate() fires after changed add()/remove()/reindex()/setItems() operations —
// not on no-ops like removing an item that isn't indexed
const unsubscribe = index.onMutate(() => {
  console.log(\`  (index changed — now \${index.size} items)\`)
})

console.log('Search "keyboard":', index.search('keyboard').map(r => r.item.title))

// Add a newly created item
index.add({ id: 4, title: 'Gaming Keyboard', price: 120 })
console.log('After add():', index.search('keyboard').map(r => r.item.title))

// Re-index a mutated item — reference equality, so mutate in place first
products[0].title = 'Wireless Trackball'
index.reindex(products[0])
console.log('After reindex():', index.search('trackball').map(r => r.item.title))

// Reconcile a refreshed corpus in one mutation — removes missing references,
// adds new ones, reindexes retained values, and preserves this incoming order
index.setItems([products[0], { id: 4, title: 'Portable SSD', price: 95 }])
console.log('After setItems():', index.items.map(item => item.title))

unsubscribe()`,
  name: 'Incremental Updates',
};
