export const middlewareExample = {
  code: `import { createCourier, withBearerAuth, withRequestId } from '@vielzeug/courier'

const fetch: typeof globalThis.fetch = async (_url, init) =>
  new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } })

let token = 'initial-token'
const courier = createCourier({
  baseUrl: 'https://api.example.com',
  fetch,
  middleware: [withBearerAuth(() => token), withRequestId({ generate: () => 'req-1' })],
})

await courier.get('/profile')
console.log('First request sent with initial token')

token = 'refreshed-token'
await courier.request('/profile', { method: 'POST', body: { update: true } })
console.log('Second request sent with refreshed token')

courier.dispose()
console.log('✓ Client disposed')`,
  name: 'middleware - Immutable Chain',
};
