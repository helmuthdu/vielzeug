export const localSourceBasicsExample = {
  code: `import { createLocalSource, decodeQuery, encodeQuery, filterContains, sortBy } from '@vielzeug/sourcerer'

const users = [
  { id: 1, name: 'Ada Lovelace', role: 'admin' },
  { id: 2, name: 'Grace Hopper', role: 'admin' },
  { id: 3, name: 'Linus Torvalds', role: 'member' },
  { id: 4, name: 'Margaret Hamilton', role: 'member' },
]

const source = createLocalSource(users, { limit: 2 })

// update() applies filter + sort atomically — one recompute, one notification
await source.update({
  filter: filterContains((u) => u.name, 'a'),
  sort: sortBy((u) => u.name, 'asc'),
})

console.log('Page 1:', source.current)
console.log('Total matching:', source.meta.totalItems)

await source.next()
console.log('Page 2:', source.current)

// Serialize to URL params
const params = encodeQuery(source.toQuery())
console.log('Encoded params:', params)

// Restore from params (e.g. on page load from location.search)
await source.reset()
await source.restore(decodeQuery(params))
console.log('Restored page:', source.current)`,
  name: 'Local Source Basics',
};
