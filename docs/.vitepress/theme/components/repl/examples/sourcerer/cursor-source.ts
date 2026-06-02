export const cursorSourceExample = {
  code: `// Cursor-based source: navigate by opaque tokens; restore state with restoreQuery()
import { createCursorSource } from '@vielzeug/sourcerer'

const allItems = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, label: \`Item \${i + 1}\` }))

const source = createCursorSource({
  fetch: async ({ after, limit }) => {
    const startIndex = after ? allItems.findIndex(x => String(x.id) === after) + 1 : 0
    const page = allItems.slice(startIndex, startIndex + limit)
    const lastId = page.at(-1)?.id
    return {
      items: page,
      nextCursor: lastId !== undefined && startIndex + limit < allItems.length ? String(lastId) : undefined,
      total: allItems.length,
    }
  },
  limit: 10,
})

await source.ready()
console.log('Page 1:', source.current.map(x => x.label).join(', '))
console.log('hasNextPage:', source.meta.hasNextPage)

await source.next()
console.log('Page 2:', source.current.map(x => x.label).join(', '))

// Serialize state and restore it later (e.g. from URL params)
const snapshot = source.toQuery()
console.log('Snapshot limit:', snapshot.limit, '— after cursor:', snapshot.after)

await source.reset()
console.log('After reset, back to page 1:', source.current[0]?.label)

// restoreQuery() re-applies a saved snapshot without redundant fetches
await source.restoreQuery({ limit: 10 })
console.log('After restoreQuery (no change) — fetch count unchanged')

source.dispose()`,
  name: 'Cursor Source & restoreQuery',
};
