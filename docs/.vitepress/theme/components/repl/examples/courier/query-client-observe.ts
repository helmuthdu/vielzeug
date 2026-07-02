export const queryClientObserveExample = {
  code: `import { createApi, createQuery } from '@vielzeug/courier'

type Post = { id: number; title: string; body: string }

const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })
const qc = createQuery({ staleTime: 5_000 })

// observe() returns a SyncStore AND triggers a background fetch.
// placeholderData is shown while the request is in-flight.
const store = qc.observe<Post, string>({
  key: ['posts', 1],
  fn: ({ signal }) => http.get<Post>('/posts/{id}', { params: { id: 1 }, signal }),
  placeholderData: 'Loading…',
  select: (post) => post?.title,
})

console.log('Initial status:', store.peek().status)
console.log('Placeholder:', store.peek().data)

const unsub = store.subscribe(() => {
  const snap = store.peek()
  if (snap.status === 'success') {
    console.log('Title:', snap.data)
    unsub()
  }
  if (snap.status === 'error') {
    console.error('Error:', snap.error?.message)
    unsub()
  }
})
`,
  name: 'Query Client - observe() with select',
};
