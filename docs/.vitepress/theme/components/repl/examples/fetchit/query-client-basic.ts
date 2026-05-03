export const queryClientBasicExample = {
  code: "import { createQuery, createApi } from '@vielzeug/fetchit'\n\nconst http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })\n\nconst queryClient = createQuery({ staleTime: 5000, gcTime: 300000 })\n\n// First call — hits the network\nconsole.log('First query...')\nconst data1 = await queryClient.query({\n  key: ['posts', 1],\n  fn: () => http.get('/posts/1'),\n})\nconsole.log('Data:', data1.title)\n\n// Second call — served from cache (within staleTime)\nconsole.log('Second query (cached)...')\nconst data2 = await queryClient.query({\n  key: ['posts', 1],\n  fn: () => http.get('/posts/1'),\n})\nconsole.log('Data:', data2.title)\nconsole.log('✓ Second request used cached data!')",
  name: 'Query Client - Basic Caching',
};
