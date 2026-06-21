export const queryClientSubscriptionsExample = {
  code: `import { createQuery, createApi } from '@vielzeug/courier'

// observe({ fetch: false }) gives a read-through store; observe() also triggers a background fetch.
const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })
const qc = createQuery({ staleTime: 5_000 })

// observe({ fetch: false }) — passive store for one key; no fetch triggered
const keyStore = qc.observe({ fetch: false, key: ['posts', 1] })
console.log('read-only store initial status:', keyStore.peek().status)

const unsub1 = keyStore.subscribe(() => {
  const snap = keyStore.peek()
  console.log('read-only store →', snap.status)
})

// observe() — store + background fetch if stale/missing; accepts select + placeholderData
const titleStore = qc.observe({
  key: ['posts', 1],
  fn: ({ signal }) => http.get('/posts/{id}', { params: { id: 1 }, signal }),
  select: (post) => post?.title,
  placeholderData: 'Loading…',
})

console.log('observe placeholder:', titleStore.peek().data)

const unsub2 = titleStore.subscribe(() => {
  const snap = titleStore.peek()
  if (snap.status === 'success') console.log('Title:', snap.data)
  if (snap.status === 'error') console.error('Error:', snap.error.message)
})

// observe() triggered the fetch above — wait for it to land
await new Promise((resolve) => setTimeout(resolve, 1500))

unsub1()
unsub2()
console.log('✓ Both stores unsubscribed')`,
  name: 'Query Client - observe() with and without fetch',
};
