export const queryClientSubscriptionsExample = {
  code: "import { createQuery, createApi } from '@vielzeug/fetchit'\n\nconst http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })\nconst queryClient = createQuery()\n\n// Subscribe to query state changes\nconst unsubscribe = queryClient.subscribe(['posts', 1], (state) => {\n  console.log('Query state:', {\n    status: state.status,\n    updatedAt: state.updatedAt,\n  })\n})\n\n// Fetch triggers subscribers\nawait queryClient.query({\n  key: ['posts', 1],\n  fn: () => http.get('/posts/1'),\n})\n\nunsubscribe()\nconsole.log('Unsubscribed')",
  name: 'Query Client - Subscriptions',
};
