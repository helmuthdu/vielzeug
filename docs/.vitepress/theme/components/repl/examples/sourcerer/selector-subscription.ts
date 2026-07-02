export const cursorSourceBasicsExample = {
  code: `import { createCursorSource } from '@vielzeug/sourcerer'

// Simulate a cursor-based API (e.g. relay-style GraphQL, DynamoDB, Stripe)
const allItems = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: \`Item \${i + 1}\` }))

const source = createCursorSource({
  fetch: async ({ after, limit }, _signal) => {
    const startIndex = after
      ? allItems.findIndex((item) => String(item.id) === after) + 1
      : 0
    const page = allItems.slice(startIndex, startIndex + limit)
    const lastId = page[page.length - 1]?.id
    return {
      items: page,
      nextCursor: lastId !== undefined && lastId < allItems.length ? String(lastId) : undefined,
      prevCursor: startIndex > 0 ? String(allItems[startIndex - 1].id) : undefined,
      total: allItems.length,
    }
  },
  limit: 2,
})

await source.ready()
console.log('Page 1:', source.current)
console.log('hasNext:', source.meta.hasNextPage, 'hasPrev:', source.meta.hasPrevPage)

await source.next()
console.log('Page 2:', source.current)
console.log('hasNext:', source.meta.hasNextPage, 'hasPrev:', source.meta.hasPrevPage)

await source.next()
console.log('Page 3 (last):', source.current)
console.log('hasNext:', source.meta.hasNextPage)

await source.prev()
console.log('Back to page 2:', source.current)

await source.reset()
console.log('After reset:', source.current)`,
  name: 'Cursor Source',
};
