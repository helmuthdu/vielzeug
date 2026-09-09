export const cachedReadExample = {
  code: `import { createCourier } from '@vielzeug/courier'

let requests = 0
const courier = createCourier({
  baseUrl: 'https://api.example.com',
  fetch: async () => {
    requests++
    return Response.json({ id: 1, name: 'Ada' })
  },
})
const cache = { key: ['users', 1] as const, ttlMs: 30_000 }

await courier.prefetch('/users/{id}', { cache, params: { id: 1 } })
const user = await courier.get('/users/{id}', { cache, params: { id: 1 } })
const cached = await courier.get('/users/{id}', { cache, params: { id: 1 } })

console.log(user.name, cached.name)
console.log('Network requests:', requests)

courier.invalidateCache(['users'])
courier.dispose()`,
  name: 'Cached Read and Prefetch',
};
