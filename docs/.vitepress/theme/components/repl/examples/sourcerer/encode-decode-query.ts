export const encodeDecodeQueryExample = {
  code: `// encodeQuery / decodeQuery: serialise source state to URL params and restore it
import { createRemoteSource, decodeQuery, encodeQuery } from '@vielzeug/sourcerer'

const source = createRemoteSource({
  fetch: async ({ filter, limit, page, search }) => {
    console.log('fetch called with:', { filter, limit, page, search })
    return { items: [], total: 0 }
  },
  filter: { role: 'admin' },
  limit: 25,
  sort: { by: 'name', dir: 'asc' },
})

await source.ready()

// Encode current query to flat URL-safe params
const params = encodeQuery(source.toQuery())
console.log('Encoded params:', params)

// Simulate serialising to a URL
const url = new URLSearchParams(params).toString()
console.log('URL string:', url)

// Decode back from URLSearchParams
const restored = decodeQuery(new URLSearchParams(url), { defaultLimit: 25 })
console.log('Decoded page:', restored.page, '— limit:', restored.limit)

// Restore state from decoded query (no-op if nothing changed)
await source.restoreQuery(restored)
console.log('State after restoreQuery — page:', source.meta.pageNumber)

source.dispose()`,
  name: 'encodeQuery & decodeQuery',
};
