export const httpClientHeadersExample = {
  code: "import { createApi } from '@vielzeug/courier'\n\nconst http = createApi({\n  baseUrl: 'https://jsonplaceholder.typicode.com',\n  headers: {\n    Authorization: 'Bearer token123',\n    'X-Custom-Header': 'CustomValue',\n  },\n})\n\nconsole.log('HTTP client created with custom headers')\n\n// Update headers dynamically\nhttp.headers({ Authorization: 'Bearer newtoken456' })\nconsole.log('Headers updated successfully')\n\n// Make request with updated headers\nconst data = await http.get('/posts/1')\nconsole.log('Fetched with new headers:', data.title)",
  name: 'HTTP Client - Custom Headers',
};
