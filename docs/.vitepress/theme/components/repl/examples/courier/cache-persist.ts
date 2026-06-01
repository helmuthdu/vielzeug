export const cachePersistExample = {
  code: `import { createApi, createQuery, hydrateQueryCache, persistQueryCache } from '@vielzeug/courier'

const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })
const qc = createQuery({ staleTime: 60_000 })

// A simple in-memory storage that mimics the PersistStorage interface.
// In a real app, pass localStorage or an IndexedDB adapter here.
const memStorage = new Map()
const storage = {
  getItem: (key) => memStorage.get(key) ?? null,
  setItem: (key, value) => { memStorage.set(key, value) },
  removeItem: (key) => { memStorage.delete(key) },
}

const KEYS = [['posts', 1], ['users', 1]]

// --- Step 1: hydrate — seed the cache from storage before any fetch calls ---
// On the first run storage is empty, so nothing gets hydrated.
await hydrateQueryCache(qc, {
  keys: KEYS,
  storage,
  maxAge: 24 * 60 * 60_000, // ignore entries older than 1 day
  onError: (err, key) => console.warn('Hydration error for', key, err),
})
console.log('Hydrated. post cached?', qc.getState(['posts', 1])?.status ?? 'no')

// --- Step 2: wire up persistence for future writes ---
// persistQueryCache also eagerly writes any already-successful entries.
const stopPersisting = persistQueryCache(qc, {
  keys: KEYS,
  storage,
  onError: (err, key) => console.warn('Persist error for', key, err),
})

// --- Step 3: fetch data normally — successful entries auto-persist ---
await qc.fetch({ key: ['posts', 1], fn: ({ signal }) => http.get('/posts/1', { signal }) })
await qc.fetch({ key: ['users', 1], fn: ({ signal }) => http.get('/users/1', { signal }) })
console.log('Stored keys:', [...memStorage.keys()])

// --- Step 4: simulate a page reload by clearing the cache, then re-hydrating ---
stopPersisting()
qc.clear()
console.log('Cache cleared. post cached?', qc.getState(['posts', 1])?.status ?? 'no')

await hydrateQueryCache(qc, { keys: KEYS, storage })
const post = qc.get(['posts', 1])
console.log('✓ Post restored from storage:', post?.title)`,
  name: 'Cache Persistence - persistQueryCache / hydrateQueryCache',
};
