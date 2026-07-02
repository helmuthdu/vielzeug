export const remoteSourceBasicsExample = {
  code: `import { applyRemoteQuery, createRemoteSource, decodeQuery, encodeQuery } from '@vielzeug/sourcerer'

const dataset = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: \`Issue \${i + 1}\`,
}))

// autoFetch: true by default — fires on creation
const source = createRemoteSource({
  fetch: async ({ limit, page, search }, _signal) => {
    const filtered = search
      ? dataset.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
      : dataset
    return {
      items: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
    }
  },
  limit: 5,
})

await source.ready()
console.log('Initial:', source.current, source.meta)

await source.search('1', { immediate: true })
console.log('Search results:', source.current, source.meta)

// Optimistic update: remove an item immediately before server confirms
const rollback = source.optimisticUpdate(
  (items) => items.filter((item) => item.id !== 1),
)
console.log('After optimistic remove:', source.current.length)
rollback() // undo
console.log('After rollback:', source.current.length)

// URL param serialization roundtrip
const params = encodeQuery(source.toQuery())
console.log('Encoded params:', params)
await source.reset()
await applyRemoteQuery(source, decodeQuery(params))
console.log('Restored:', source.current, source.meta)`,
  name: 'Remote Source Basics',
};
