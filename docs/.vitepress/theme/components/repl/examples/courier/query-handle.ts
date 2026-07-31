export const queryHandleExample = {
  code: `import { createCourier } from '@vielzeug/courier'

// A query handle owns cache state for one explicit async data source.
  const fetch: typeof globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: 1, name: 'Ada' }), { headers: { 'content-type': 'application/json' } })
  const courier = createCourier({ baseUrl: 'https://api.example.com', fetch })
const user = courier.queries.create({
  key: ['users', 1],
  fetch: ({ signal }) => courier.get('/users/1', { signal }),
  staleTime: 30_000,
})

user.subscribe(() => {
  const state = user.getSnapshot()
  console.log('State:', state.status, '| fetching:', state.isFetching)
})

await user.fetch()
console.log('Name:', user.getSnapshot().data.name)

user.invalidate()
courier.queries.refetchStale()

console.log('Final snapshot:', user.getSnapshot())`,
  name: 'queryHandle - Cached Async Data',
};
