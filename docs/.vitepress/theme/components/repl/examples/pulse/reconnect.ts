export const reconnectExample = {
  code: `import { createPulse, ConnectionError } from '@vielzeug/pulse'

// onReconnect fires at the start of each reconnect attempt (1-based)
// Channels are automatically re-subscribed when the socket reopens.
const pulse = createPulse('wss://api.example.com/ws', {
  reconnect: { delay: 500, maxAttempts: 3 },
  onReconnect: (attempt) => {
    console.log('reconnect attempt #' + attempt)
  },
  onOpen:  () => console.log('open — status:', pulse.status.value),
  onClose: (code) => console.log('closed, code:', code),
})

// Channel is tracked: re-subscribed automatically after every reconnect
const chat = pulse.channel('chat')
chat.on('message', ({ from, text }) => console.log(from + ': ' + text))

// Connect explicitly to observe the status
try {
  await pulse.connect()
  console.log('connected, status:', pulse.status.value)
} catch (err) {
  if (err instanceof ConnectionError) {
    console.log('connection failed:', err.message)
  }
}

console.log('channel name:', chat.name)
console.log('channel disposed?', chat.disposed)

// Disposing a channel removes it from re-subscription tracking
chat.dispose()
console.log('channel disposed, pulse still running:', !pulse.disposed)

pulse.dispose()`,
  name: 'Reconnect & onReconnect',
};
