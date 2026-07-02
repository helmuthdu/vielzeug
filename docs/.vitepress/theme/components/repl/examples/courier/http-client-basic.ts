export const httpClientBasicExample = {
  code: `import { createApi } from '@vielzeug/courier'

const http = createApi({
  baseUrl: 'https://jsonplaceholder.typicode.com',
  timeout: 8000,
})

console.log('Creating HTTP client...')

try {
  // GET request
  const todo = await http.get('/todos/1')
  console.log('✓ GET /todos/1:', todo)

  // POST request (might not persist on mock API)
  const newTodo = await http.post('/todos', {
    body: { title: 'Learn Courier', completed: false, userId: 1 },
  })
  console.log('✓ POST /todos:', newTodo)
} catch (err) {
  console.error('Request failed:', err.message)
}`,
  name: 'HTTP Client - Basic Requests',
};
