export const queryClientSubscriptionsExample = {
  code: "import { createQuery, createApi } from '@vielzeug/fetchit'\n\nconst http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })\nconst queryClient = createQuery()\n\nconst unsubscribe = queryClient.subscribe(['posts', 1], (state) => {\n  console.log('Query state:', {\n    status: state.status,\n    isFetching: state.isFetching,\n    updatedAt: state.updatedAt,\n  })\n})\n\nawait queryClient.query({\n  key: ['posts', 1],\n  fn: ({ signal }) => http.get('/posts/{id}', { params: { id: 1 }, signal }),\n})\n\nunsubscribe()\nconsole.log('Unsubscribed')",
  name: 'Query Client - Subscriptions',
};
