export const httpClientParamsExample = {
  code: `import { createApi } from '@vielzeug/courier'

const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })

// GET with query parameters
const posts = await http.get('/posts', {
  query: { userId: 1, _limit: 5 },
})
console.log('Filtered posts count:', posts.length)

// GET with path parameters
const user = await http.get('/users/{id}', {
  params: { id: 1 },
})
console.log('User:', user.name)

// Combine path and query parameters
const userPosts = await http.get('/posts', {
  query: { userId: 1, _limit: 3 },
})
console.log('User posts:', userPosts.length, 'items')`,
  name: 'HTTP Client - Path & Query Parameters',
};
