export const cursorSourceExample = {
  code: `import { createCursorSource } from '@vielzeug/sourcerer'

const items = Array.from({ length: 30 }, (_, index) => ({ id: index + 1, label: \`Item \${index + 1}\` }))

const source = createCursorSource({
  initialQuery: { pageSize: 10 },
  load: async ({ query }) => {
    const start = query.after ? Number(query.after) : 0
    const data = items.slice(start, start + query.pageSize)
    const next = start + data.length
    return { data, nextCursor: next < items.length ? String(next) : undefined, previousCursor: start ? String(Math.max(0, start - query.pageSize)) : undefined }
  },
})

await source.reload()
await source.page.next()
console.log(source.snapshot.data.map((item) => item.label))
console.log(source.snapshot.pagination)

source.dispose()`,
  name: 'Cursor Source',
};
