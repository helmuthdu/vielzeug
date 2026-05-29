export const httpInterceptorsExample = {
  code: `import { createApi, withBearerAuth, withLogging, withRequestId } from '/courier'

const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })

// withBearerAuth — inject Authorization header before every request
// Accepts a static token or an async factory for token-refresh flows
http.use(withBearerAuth('my-static-token'))
http.use(withBearerAuth(async () => {
  // replace with your real token source
  return 'refreshed-token'
}))

// withRequestId — add a unique x-request-id header (uses crypto.randomUUID)
http.use(withRequestId())
http.use(withRequestId({ header: 'x-trace-id' }))

// withLogging — log method, URL, status, and duration to console.debug
http.use(withLogging())
http.use(withLogging({
  logger: (msg, meta) => console.log(msg, meta),
}))

const data = await http.get('/posts/1')
console.log('Post:', data.title)

// Custom interceptor — short-circuit or mutate the request
const removeCustom = http.use(async (ctx, next) => {
  ctx.init.headers = { ...(ctx.init.headers ?? {}), 'x-custom': 'value' }
  return next(ctx)
})

const data2 = await http.get('/posts/2')
console.log('Post 2:', data2.title)

removeCustom()
console.log('✓ Custom interceptor removed')`,
  name: 'HTTP Client - Interceptor Presets',
};
