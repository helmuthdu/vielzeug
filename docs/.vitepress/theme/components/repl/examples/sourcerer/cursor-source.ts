export const cursorSourceExample = {
  code: `import { createCursorSource } from '@vielzeug/sourcerer'

const items = Array.from({ length: 30 }, (_, index) => ({ id: index + 1, label: \`Item \${index + 1}\` }))

const source = createCursorSource({
  load: async ({ after, pageSize }) => {
    const start = after ? Number(after) : 0
    const pageItems = items.slice(start, start + pageSize)
    const next = start + pageItems.length
    return { items: pageItems, nextCursor: next < items.length ? String(next) : undefined, previousCursor: start ? String(Math.max(0, start - pageSize)) : undefined }
  },
  pageSize: 10,
})

await source.reload()
await source.next()
console.log(source.state.items.map((item) => item.label))
console.log(source.state.pagination)

source.dispose()`,
  name: 'Cursor Source',
};
