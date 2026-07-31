export const queryClientUrlExample = {
  code: `import { createCourier } from '@vielzeug/courier'

// url-sourced queries flow through the courier's transport — interceptors,
// global headers, and baseUrl apply automatically (no hand-written fn).
const client = createCourier({ baseUrl: 'https://jsonplaceholder.typicode.com' })

client.use(async (ctx, next) => {
  console.log('→', ctx.url)
  return next(ctx)
})

const user = await client.query.fetch({
  key: ['users', 1],
  url: '/users/{id}',
  params: { id: '1' },
})
console.log('fetched:', user.name)

// Cached on the second call — no second request
const again = await client.query.fetch({ key: ['users', 1], url: '/users/{id}', params: { id: '1' }, staleTime: 60_000 })
console.log('cached:', again.name)

// fn remains the escape hatch for non-HTTP sources — it bypasses the pipeline
const local = await client.query.fetch({ key: ['local'], fn: async () => ({ computed: 42 }) })
console.log('local:', local.computed)

client.dispose()`,
  name: 'Query Client — url source (routed through the api client)',
};
