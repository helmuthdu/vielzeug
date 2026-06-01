export const queryClientMutationsExample = {
  code: "import { createMutation, createApi } from '@vielzeug/courier'\n\nconst http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })\n\nconst createPost = createMutation(\n  (input, signal) => http.post('/posts', { body: input, signal }),\n)\n\nconst result = await createPost.mutate({ title: 'New Post', body: 'Content', userId: 1 })\nconsole.log('Result:', result)",
  name: 'Mutations - createMutation',
};
