export const incrementalUpdatesExample = {
  code: `import { createIndex } from '@vielzeug/scout'

const products = [
  { id: 1, title: 'Wireless Mouse',      price: 25 },
  { id: 2, title: 'Mechanical Keyboard', price: 80 },
  { id: 3, title: 'USB-C Hub',           price: 35 },
]

const index = createIndex(products, { fields: ['title'] })

// onMutate() fires after add()/remove()/reindex() actually change the index —
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

// Remove an item by reference
index.remove(products[2])
console.log('After remove():', index.search('usb').map(r => r.item.title))

unsubscribe()`,
  name: 'Incremental Updates',
};
