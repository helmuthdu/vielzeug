export const localSourceExample = {
  code: `// In-memory source with pagination, filter, sort, search, and ready()
import { createLocalSource } from '@vielzeug/sourcerer'

const users = [
  { id: 1, name: 'Ada Lovelace',    role: 'admin' },
  { id: 2, name: 'Grace Hopper',    role: 'admin' },
  { id: 3, name: 'Linus Torvalds',  role: 'user'  },
  { id: 4, name: 'Margaret Hamilton', role: 'user' },
  { id: 5, name: 'Alan Turing',     role: 'user'  },
]

const source = createLocalSource(users, { limit: 3 })

console.log('Page 1 items:', source.current.map(u => u.name))
console.log('Total items:', source.meta.totalItems, '— Pages:', source.meta.pageCount)

await source.setFilter(u => u.role === 'admin')
console.log('Admin filter:', source.current.map(u => u.name))

await source.setFilter(undefined)
await source.setSort((a, b) => a.name.localeCompare(b.name))
console.log('Sorted page 1:', source.current.map(u => u.name))

await source.search('a', { immediate: true })
console.log('Search "a" results:', source.current.map(u => u.name))

// ready() resolves once all pending async work settles
await source.reset()
await source.ready()
console.log('Ready — isLoading:', source.meta.isLoading)`,
  name: 'Local Source',
};
