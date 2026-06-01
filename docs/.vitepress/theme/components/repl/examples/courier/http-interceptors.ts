export const httpInterceptorsExample = {
  code: `import { createApi, withBearerAuth, withLogging, withRequestId } from '@vielzeug/courier'

const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })

// withBearerAuth — injects Authorization header; accepts a static token
// or an async factory useful for token-refresh flows
http.use(withBearerAuth(async () => 'my-access-token'))

// withRequestId — adds a unique x-request-id (crypto.randomUUID) to every request
http.use(withRequestId())

// withLogging — logs method, URL, HTTP status, and duration
http.use(withLogging({ logger: (msg) => console.log(msg) }))

// Make a request — all three interceptors run in order
const data = await http.get('/posts/1')
console.log('Post:', data.title)

// Custom interceptor — mutate or short-circuit the request/response
// use() returns a dispose function to remove the interceptor later
const removeCustom = http.use(async (ctx, next) => {
  ctx.init.headers = { ...ctx.init.headers, 'x-custom': 'value' }
  return next(ctx)
})

const data2 = await http.get('/posts/2')
console.log('Post 2:', data2.title)

// Remove only the custom interceptor; built-in presets remain active
removeCustom()
console.log('✓ Custom interceptor removed')`,
  name: 'HTTP Client - Interceptor Presets',
};
