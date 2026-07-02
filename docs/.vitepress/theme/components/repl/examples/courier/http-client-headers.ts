export const httpClientHeadersExample = {
  code: `import { createApi } from '@vielzeug/courier'

const http = createApi({
  baseUrl: 'https://jsonplaceholder.typicode.com',
  headers: {
    Authorization: 'Bearer token123',
    'X-Custom-Header': 'CustomValue',
  },
})

console.log('HTTP client created with custom headers')

// Update headers dynamically
http.headers({ Authorization: 'Bearer newtoken456' })
console.log('Headers updated successfully')

// Make request with updated headers
const data = await http.get('/posts/1')
console.log('Fetched with new headers:', data.title)`,
  name: 'HTTP Client - Custom Headers',
};
