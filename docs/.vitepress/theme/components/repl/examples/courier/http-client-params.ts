export const httpClientParamsExample = {
  code: "import { createApi } from '/courier'\n\nconst http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })\n\n// GET with query parameters\nconst posts = await http.get('/posts', {\n  query: { userId: 1, _limit: 5 },\n})\nconsole.log('Filtered posts count:', posts.length)\n\n// GET with path parameters\nconst user = await http.get('/users/{id}', {\n  params: { id: 1 },\n})\nconsole.log('User:', user.name)\n\n// Combine path and query parameters\nconst userPosts = await http.get('/posts', {\n  query: { userId: 1, _limit: 3 },\n})\nconsole.log('User posts:', userPosts.length, 'items')",
  name: 'HTTP Client - Path & Query Parameters',
};
