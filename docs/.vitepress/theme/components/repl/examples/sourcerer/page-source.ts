export const pageSourceExample = {
  code: `import { createPageSource } from '@vielzeug/sourcerer'

const allItems = Array.from({ length: 47 }, (_, index) => ({ id: index + 1, name: \`Item \${index + 1}\` }))

const source = createPageSource({
  load: async ({ page, pageSize, params: search }) => {
    const filtered = search ? allItems.filter((item) => item.name.includes(search)) : allItems
    const start = (page - 1) * pageSize
    return { items: filtered.slice(start, start + pageSize), totalItems: filtered.length }
  },
  pageSize: 10,
  params: '',
})

await source.reload()
await source.setParams('Item 4')
console.log(source.state.items.map((item) => item.name))
console.log(source.state.pagination)

source.dispose()`,
  name: 'Page Source',
};
