export const httpInterceptorsExample = {
  code: "import { createApi, HttpError } from '/courier'\n\nconst http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })\n\n// Add a request/response interceptor\nconst remove = http.use(async (ctx, next) => {\n  console.log('→ Request:', ctx.url)\n  const start = Date.now()\n  try {\n    const response = await next(ctx)\n    console.log(`← Response: ${ctx.url} (${Date.now() - start}ms)`)\n    return response\n  } catch (err) {\n    if (HttpError.is(err)) {\n      console.error(`← Error ${err.status}: ${ctx.url}`)\n    }\n    throw err\n  }\n})\n\nconst data = await http.get('/posts/1')\nconsole.log('Post:', data.title)\n\n// Remove the interceptor\nremove()",
  name: 'HTTP Client - Interceptors',
};
