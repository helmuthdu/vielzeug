export const queryClientSubscriptionsExample = {
  code: `import { createQuery, createApi } from '/courier'

const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })
const queryClient = createQuery({ staleTime: 5_000 })

// subscribe() does NOT fire immediately — it fires only on the next state change.
// Read the current snapshot synchronously before subscribing.
const current = queryClient.getState(['posts', 1])
console.log('Initial state:', current?.status ?? 'not cached')

const unsubscribe = queryClient.subscribe(['posts', 1], (state) => {
  console.log('State change →', state.status, '| updatedAt:', state.updatedAt)
})

// Triggering a fetch will emit state changes: idle → pending → success
await queryClient.fetch({
  key: ['posts', 1],
  fn: ({ signal }) => http.get('/posts/{id}', { params: { id: 1 }, signal }),
})

// select + placeholderData narrow the subscription to a derived value
const unsub2 = queryClient.subscribe(
  ['posts', 1],
  (title) => console.log('Title now:', title),
  {
    select: (post) => post?.title,
    placeholderData: 'Loading…',
  },
)

await queryClient.fetch({
  key: ['posts', 1],
  fn: ({ signal }) => http.get('/posts/{id}', { params: { id: 1 }, signal }),
})

unsubscribe()
unsub2()
console.log('✓ Both subscriptions removed')`,
  name: 'Query Client - Subscriptions',
};
