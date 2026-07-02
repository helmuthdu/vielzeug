export const httpClientMethodsExample = {
  code: `import { createApi } from '@vielzeug/courier'

const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })

// GET
const post = await http.get('/posts/1')
console.log('GET:', post.title)

// POST
const created = await http.post('/posts', {
  body: { title: 'New Post', body: 'Content', userId: 1 },
})
console.log('POST id:', created.id)

// PUT
const updated = await http.put('/posts/1', {
  body: { id: 1, title: 'Updated', body: 'New content', userId: 1 },
})
console.log('PUT:', updated.title)

// PATCH
const patched = await http.patch('/posts/1', {
  body: { title: 'Patched Title' },
})
console.log('PATCH:', patched.title)

// DELETE
await http.delete('/posts/1')
console.log('DELETE: Success')`,
  name: 'HTTP Client - All Methods',
};
