export const syncStoreExample = {
  code: `import { createApi, createMutation, toSyncStore } from '@vielzeug/courier'

// toSyncStore() adapts any { peek(), subscribe() } source into a plain SyncStore —
// useful for framework adapters (e.g. React's useSyncExternalStore) that expect
// exactly that shape rather than consuming peek/subscribe separately.
const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })

const createPost = createMutation((input, signal) => http.post('/posts', { body: input, signal }))

// mutation.store is already a SyncStore — toSyncStore(mutation) produces an equivalent one
const store = toSyncStore(createPost)

const unsub = store.subscribe(() => {
  const snap = store.peek()
  console.log('status:', snap.status, snap.isFetching ? '(fetching)' : '')
})

await createPost.mutate({ title: 'Hello', body: 'World', userId: 1 })

console.log('final data id:', store.peek().data.id)
unsub()`,
  name: 'toSyncStore - Framework Adapter Bridge',
};
