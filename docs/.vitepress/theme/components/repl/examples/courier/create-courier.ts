export const createCourierExample = {
  code: `import { createCourier, withLogging } from '@vielzeug/courier'

// createCourier() shares one transport across REST, query cache, streams, and mutations.
const client = createCourier({
  baseUrl: 'https://jsonplaceholder.typicode.com',
  timeout: 8_000,
  query: { staleTime: 10_000 },
})

client.use(withLogging({ logger: (msg) => console.log(msg) }))

// REST via client.api
const post = await client.api.get('/posts/1')
console.log('Post:', post.title)

// Cached query via client.query
const user = await client.query.fetch({
  key: ['users', 1],
  fn: ({ signal }) => client.api.get('/users/1', { signal }),
})
console.log('User:', user.name)

// client.mutation() — sets/invalidates shorthands seed + invalidate the shared cache on success
const createPost = client.mutation(
  (input, signal) => client.api.post('/posts', { body: input, signal }),
  {
    sets: (created) => [[ ['posts', created.id], created ]],
    invalidates: [['posts']],
    onSuccess: (data) => console.log('Created id:', data.id, '| cache size:', client.query.size),
  },
)

await createPost.mutate({ title: 'Hello Courier', body: 'World', userId: 1 })

client.dispose()
console.log('✓ Client disposed')`,
  name: 'createCourier - Unified Client',
};
