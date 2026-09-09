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
  middleware: [withLogging({ logger: (msg) => console.log(msg) })],
})

const user = await courier.get('/users/1')
console.log('User:', user.name)

const created = await courier.request('/users', { method: 'POST', body: { name: 'Courier' } })
console.log('Created id:', created.id)

courier.dispose()
console.log('✓ Client disposed')`,
  name: 'createCourier - Transport Client',
};
