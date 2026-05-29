export const queryClientBasicExample = {
  code: "import { createQuery, createApi } from '/courier'\n\nconst http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })\nconst queryClient = createQuery({ staleTime: 5000, gcTime: 300000 })\n\nconsole.log('First fetch...')\nconst data1 = await queryClient.fetch({\n  key: ['posts', 1],\n  fn: ({ signal }) => http.get('/posts/{id}', { params: { id: 1 }, signal }),\n})\nconsole.log('Data:', data1?.title)\n\nconsole.log('Second fetch (cached)...')\nconst data2 = await queryClient.fetch({\n  key: ['posts', 1],\n  fn: ({ signal }) => http.get('/posts/{id}', { params: { id: 1 }, signal }),\n})\nconsole.log('Data:', data2?.title)\nconsole.log('✓ Second request used cached data!')",
  name: 'Query Client - Basic Caching',
};
