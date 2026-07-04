export const debugCourierExample = {
  code: `import { createCourier, withLogging } from '@vielzeug/courier'

// Mirrors debugCourier() from @vielzeug/courier/devtools — in a real app, import
// debugCourier directly from the devtools sub-path instead of registering withLogging()
// manually. debugCourier() defaults to console.debug; this REPL only surfaces console.log,
// so the logger is redirected here to make the output visible.
function makeDebugCourier(options) {
  const client = createCourier(options)
  client.use(withLogging({ logger: (msg, meta) => console.log(msg, meta.status) }))
  return client
}

const client = makeDebugCourier({ baseUrl: 'https://jsonplaceholder.typicode.com' })

await client.api.get('/posts/1')
await client.api.get('/users/1')

client.dispose()
console.log('✓ Client disposed')`,
  name: 'debugCourier - Request Logging (devtools)',
};
