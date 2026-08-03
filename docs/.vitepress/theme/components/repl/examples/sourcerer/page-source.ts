export const pageSourceExample = {
  code: `import { createPageSource } from '@vielzeug/sourcerer'

const allItems = Array.from({ length: 47 }, (_, index) => ({ id: index + 1, name: \`Item \${index + 1}\` }))

const source = createPageSource({
  initialQuery: { pageSize: 10 },
  load: async ({ query }) => {
    const filtered = query.search ? allItems.filter((item) => item.name.includes(query.search)) : allItems
    const start = (query.page - 1) * query.pageSize
    return { data: filtered.slice(start, start + query.pageSize), total: filtered.length }
  },
})

await source.reload()
await source.setQuery({ search: 'Item 4' })
console.log(source.snapshot.data.map((item) => item.name))
console.log(source.snapshot.pagination)

source.dispose()`,
  name: 'Page Source',
};
