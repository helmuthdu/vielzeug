export const infiniteSourceExample = {
  code: `import { createInfiniteSource } from '@vielzeug/sourcerer'

const posts = Array.from({ length: 25 }, (_, index) => ({ id: index + 1, title: \`Post \${index + 1}\` }))

const source = createInfiniteSource({
  load: async ({ page, pageSize }) => {
    const start = (page - 1) * pageSize
    return { items: posts.slice(start, start + pageSize), totalItems: posts.length }
  },
  pageSize: 8,
})

await source.reload()
await source.loadMore()
console.log(source.state.items.length)
console.log(source.state.pagination)

source.dispose()`,
  name: 'Infinite Source',
};
