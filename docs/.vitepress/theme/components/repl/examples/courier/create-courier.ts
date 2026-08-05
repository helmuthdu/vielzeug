export const createCourierExample = {
  code: `import { createCourier, withLogging } from '@vielzeug/courier'

const fetch: typeof globalThis.fetch = async (_url, init) =>
  new Response(JSON.stringify(init?.method === 'POST' ? { id: 3, name: 'Courier' } : { id: 1, name: 'Ada' }), {
    headers: { 'content-type': 'application/json' },
  })

const courier = createCourier({
  baseUrl: 'https://api.example.com',
  fetch,
  timeout: 8_000,
  query: { staleTime: 10_000 },
})

courier.use(withLogging({ logger: (msg) => console.log(msg) }))

const user = await courier.get('/users/1')
console.log('User:', user.name)

const key = ['users', 1]
await courier.queries.fetch({
  key,
  fetch: ({ signal }) => courier.get('/users/1', { signal }),
})
console.log('Cached user:', courier.queries.getSnapshot(key)?.data.name)

const created = await courier.mutate({
  request: ({ signal }) => courier.post('/users', { body: { name: 'Courier' }, signal }),
  onSuccess: (createdUser, queries) => queries.set(['users', createdUser.id], createdUser),
})

console.log('Created id:', created.id)
courier.dispose()
console.log('✓ Client disposed')`,
  name: 'createCourier - Unified Client',
};
