export const queryClientInvalidateExample = {
  code: `import { createQuery, createApi } from '@vielzeug/courier'

const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })
const queryClient = createQuery()

await queryClient.fetch({
  key: ['users'],
  fn: ({ signal }) => http.get('/users', { signal }),
})
console.log('✓ Data cached for key: ["users"]')

queryClient.invalidate(['users'])
console.log('✓ Cache invalidated for ["users"]')

await queryClient.fetch({ key: ['users', 1], fn: ({ signal }) => http.get('/users/{id}', { params: { id: 1 }, signal }) })
await queryClient.fetch({ key: ['users', 2], fn: ({ signal }) => http.get('/users/{id}', { params: { id: 2 }, signal }) })
console.log('✓ Cached ["users", 1] and ["users", 2]')

queryClient.invalidate(['users'])
console.log('✓ All "users" queries invalidated')`,
  name: 'Query Client - Cache Invalidation',
};
