export const infiniteSourceExample = {
  code: `// Infinite scroll source: loadMore() appends pages to source.current
import { applyInfiniteQuery, createInfiniteSource } from '@vielzeug/sourcerer'

const db = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, title: \`Post \${i + 1}\` }))

const source = createInfiniteSource({
  fetch: async ({ limit, page }) => {
    const start = (page - 1) * limit
    return { items: db.slice(start, start + limit), total: db.length }
  },
  limit: 8,
})

await source.ready()
console.log('After initial load:', source.current.length, 'items — hasMore:', source.meta.hasMore, '— loadedPages:', source.meta.loadedPages)

await source.loadMore()
console.log('After loadMore():', source.current.length, 'items — loadedPages:', source.meta.loadedPages)

await source.loadMore()
console.log('After 2nd loadMore():', source.current.length, 'items — hasMore:', source.meta.hasMore, '— loadedPages:', source.meta.loadedPages)

// loadMore() is a no-op when hasMore is false
await source.loadMore()
await source.loadMore()
console.log('After exhaustion:', source.current.length, 'items — loadedPages:', source.meta.loadedPages)

// applyInfiniteQuery({ limit?, search? }) resets and refetches if values changed — no-op otherwise
await applyInfiniteQuery(source, { limit: 5 }) // new limit — clears accumulated items and restarts
console.log('After applyInfiniteQuery(limit:5):', source.current.length, 'items — loadedPages:', source.meta.loadedPages)

await applyInfiniteQuery(source, { limit: 5 }) // same value — no fetch, no-op
console.log('No-op applyInfiniteQuery:', source.current.length, 'items')

source.dispose()`,
  name: 'Infinite Source',
};
