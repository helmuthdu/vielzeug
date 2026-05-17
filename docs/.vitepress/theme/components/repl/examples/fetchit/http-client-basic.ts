export const httpClientBasicExample = {
  code: "import { createApi } from '@vielzeug/fetchit'\n\nconst http = createApi({\n  baseUrl: 'https://jsonplaceholder.typicode.com',\n  timeout: 8000,\n})\n\nconsole.log('Creating HTTP client...')\n\ntry {\n  // GET request\n  const todo = await http.get('/todos/1')\n  console.log('✓ GET /todos/1:', todo)\n\n  // POST request (might not persist on mock API)\n  const newTodo = await http.post('/todos', {\n    body: { title: 'Learn Fetchit', completed: false, userId: 1 },\n  })\n  console.log('✓ POST /todos:', newTodo)\n} catch (err) {\n  console.error('Request failed:', err.message)\n}",
  name: 'HTTP Client - Basic Requests',
};
