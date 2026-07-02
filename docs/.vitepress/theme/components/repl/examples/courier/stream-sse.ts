export const streamSseExample = {
  code: `import { createStream } from '@vielzeug/courier'

// Note: SSE requires a real server-sent events endpoint.
// This example demonstrates the API against a public SSE test endpoint.
const stream = createStream({ baseUrl: 'https://sse.dev' })

console.log('Opening SSE connection...')

const src = stream.sse('/test', {
  // Auto-reconnect with up to 3 attempts on connection loss
  reconnect: { times: 3, delay: 1000 },
  onError: (err) => console.error('Connection lost:', err.message),
})

// Listen for named SSE events
const offMessage = src.on('message', (data) => {
  console.log('Message:', data)
})

const offPing = src.on('ping', (data) => {
  console.log('Ping received:', data)
})

// Close after 5 seconds
setTimeout(() => {
  offMessage()
  offPing()
  src.close()
  console.log('SSE connection closed')
  stream.dispose()
}, 5000)`,
  name: 'Stream - Server-Sent Events (SSE)',
};
