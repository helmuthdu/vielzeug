export const connectAndSendExample = {
  code: `import { createPulse } from '@vielzeug/pulse'

// Typed WebSocket client: on(), once(), send(), wait()
const pulse = createPulse('wss://api.example.com/ws', {
  reconnect: { maxAttempts: 5 },
})

// Subscribe before connecting — listeners are synchronous
const unsub = pulse.on('chat:message', ({ from, text }) => {
  console.log('[' + from + '] ' + text)
})

// One-shot listener: fires once and auto-removes
pulse.once('chat:message', (msg) => {
  console.log('first message:', msg.text)
})

// Connect; send when open
try {
  await pulse.connect()
  pulse.send('chat:send', { text: 'Hello, world!' })
} catch (err) {
  console.log('connect failed:', err.message)
}

// Await next server event with a 5 s deadline
try {
  const msg = await pulse.wait('chat:message', { timeout: 500 })
  console.log('received:', msg.text)
} catch (err) {
  console.log('wait ended:', err.message)
}

unsub()
pulse.dispose()`,
  name: 'Connect & Send',
};
