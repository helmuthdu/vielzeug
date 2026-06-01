export const createCourierExample = {
  code: `import { createCourier, withBearerAuth, withLogging } from '@vielzeug/courier'

// Single shared transport — interceptors, headers, and timeout apply to both api and stream
const client = createCourier({
  baseUrl: 'https://jsonplaceholder.typicode.com',
  timeout: 8000,
  query: { staleTime: 10_000, gcTime: 300_000 },
})

// Built-in interceptor presets (applied to every REST + SSE request)
client.use(withBearerAuth('my-token'))
client.use(withLogging())

// REST via client.api
const post = await client.api.get('/posts/1')
console.log('Post:', post.title)

// Cached query via client.query
const user = await client.query.fetch({
  key: ['users', 1],
  fn: ({ signal }) => client.api.get('/users/1', { signal }),
})
console.log('User:', user?.name)

// Mutation via client.mutation (inherits mutationDefaults from createCourier)
const createPost = client.mutation(
  (input, signal) => client.api.post('/posts', { body: input, signal }),
  {
    onSuccess: (data) => console.log('Created id:', data.id),
  }
)

await createPost.mutate({ title: 'Hello from createCourier' })

// Update shared headers at runtime (applies to both api and stream)
client.headers({ 'x-tenant': 'acme' })
console.log('✓ Shared header added')

client.dispose()`,
  name: 'createCourier - Unified Client',
};
