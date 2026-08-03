export const infiniteSourceExample = {
  code: `import { createInfiniteSource } from '@vielzeug/sourcerer'

const posts = Array.from({ length: 25 }, (_, index) => ({ id: index + 1, title: \`Post \${index + 1}\` }))

const source = createInfiniteSource({
  initialQuery: { pageSize: 8 },
  load: async ({ query }) => {
    const start = (query.page - 1) * query.pageSize
    return { data: posts.slice(start, start + query.pageSize), total: posts.length }
  },
})

await source.reload()
await source.loadMore()
console.log(source.snapshot.data.length)
console.log(source.snapshot.pagination)

source.dispose()`,
  name: 'Infinite Source',
};
