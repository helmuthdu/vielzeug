export const queryClientMutationsExample = {
  code: `import { createMutation, createQuery, createApi } from '@vielzeug/courier'

// createMutation with lifecycle callbacks and reactive store.
const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })
const qc = createQuery()

const createPost = createMutation(
  (input, signal) => http.post('/posts', { body: input, signal }),
  {
    onSuccess: (post, variables) => {
      qc.set(['posts', post.id], post)
      console.log('Created post', post.id, 'from input:', variables.title)
    },
    onError: (err, variables) => {
      console.error('Failed for', variables.title, ':', err.message)
    },
    onSettled: (result) => {
      // switch on result.status for exhaustive handling
      if (result.status === 'success') console.log('Settled (success) id:', result.data.id)
      else if (result.status === 'error') console.log('Settled (error):', result.error.message)
      else console.log('Settled (aborted)')
    },
  },
)

// Subscribe to reactive store before mutating
const unsub = createPost.store.subscribe(() => {
  const s = createPost.store.peek()
  console.log('store →', s.status)
})

const post = await createPost.mutate({ title: 'Hello Courier', body: 'World', userId: 1 })
console.log('Returned id:', post.id)

unsub()`,
  name: 'Mutations - Lifecycle & Store',
};
