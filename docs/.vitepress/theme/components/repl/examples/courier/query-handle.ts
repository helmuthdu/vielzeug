export const queryHandleExample = {
  code: `import { createCourier } from '@vielzeug/courier'

const fetch: typeof globalThis.fetch = async () =>
  new Response(JSON.stringify({ id: 1, name: 'Ada' }), { headers: { 'content-type': 'application/json' } })
const courier = createCourier({ baseUrl: 'https://api.example.com', fetch })
const key = ['users', 1]
const user = {
  key,
  fetch: ({ signal }: { signal: AbortSignal }) => courier.get('/users/1', { signal }),
  staleTime: 30_000,
}

courier.queries.subscribe(key, () => {
  const state = courier.queries.getSnapshot(key)
  console.log('State:', state?.status, '| fetching:', state?.isFetching)
})

await courier.queries.fetch(user)
console.log('Name:', courier.queries.getSnapshot(key)?.data.name)

courier.queries.invalidate(key)
await courier.queries.fetch(user, { force: true })

console.log('Final snapshot:', courier.queries.getSnapshot(key))`,
  name: 'queryCache - Cached Async Data',
};
