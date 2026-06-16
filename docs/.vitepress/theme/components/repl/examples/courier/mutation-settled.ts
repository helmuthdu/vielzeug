export const mutationSettledExample = {
  code: `import { createMutation, createApi } from '@vielzeug/courier'

// onSettled receives a SettledResult discriminated union — switch on status for exhaustive handling.
const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })

const updatePost = createMutation(
  (input, signal) => http.put('/posts/{id}', { params: { id: input.id }, body: input, signal }),
  {
    onSuccess: (post) => console.log('Updated title:', post.title),
    onError: (err) => console.error('Update failed:', err.message),
    onSettled: (result) => {
      if (result.status === 'success') {
        console.log('Settled OK — id:', result.data.id, '| input was:', result.variables.title)
      } else if (result.status === 'error') {
        console.log('Settled error — retried for input:', result.variables.title)
      } else {
        // 'aborted' — result.variables is still available for cleanup
        console.log('Settled aborted — input was:', result.variables.title)
      }
    },
  },
)

// Normal run — onSuccess + onSettled('success') both fire
await updatePost.mutate({ id: 1, title: 'Updated Title', body: 'New body', userId: 1 })

// Aborted run — onError is skipped; onSettled('aborted') fires
const pendingAbort = updatePost.mutate({ id: 2, title: 'Will be aborted', body: '', userId: 1 })
await updatePost.cancel()
await pendingAbort.catch(() => {})
console.log('✓ Done')`,
  name: 'Mutations - onSettled SettledResult',
};
