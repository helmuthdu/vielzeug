export const remoteSourceExample = {
  code: `// Remote source backed by an async fetch with page navigation
import { createRemoteSource } from '@vielzeug/sourcerer'

const allItems = Array.from({ length: 47 }, (_, i) => ({ id: i + 1, name: \`Item \${i + 1}\` }))

const source = createRemoteSource({
  fetch: async ({ limit, page, search }, _signal) => {
    const filtered = search
      ? allItems.filter(x => x.name.toLowerCase().includes(search.toLowerCase()))
      : allItems
    const start = (page - 1) * limit
    return { items: filtered.slice(start, start + limit), total: filtered.length }
  },
  limit: 10,
})

await source.ready()
console.log('Page 1:', source.current.map(x => x.name).join(', '))
console.log('Total:', source.meta.totalItems, '— Pages:', source.meta.pageCount)

await source.next()
console.log('Page 2:', source.current.map(x => x.name).join(', '))

await source.searchNow('item 4')
console.log('Search "item 4":', source.current.map(x => x.name))

source.dispose()`,
  name: 'Remote Source',
};
