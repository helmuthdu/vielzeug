export const reconnectExample = {
  code: `import { createPulse, PulseConnectionError } from '@vielzeug/pulse'

// Channels, rooms, and local presence state are restored on reconnect.
const pulse = createPulse('wss://api.example.com/ws', {
  reconnect: { delay: 500, maxAttempts: 3 },
  onError: (error) => console.log('transport error:', error.message),
})

// Channel is tracked: re-subscribed automatically after every reconnect
const chat = pulse.channel('chat')
chat.on('message', ({ from, text }) => console.log(from + ': ' + text))

// Connect explicitly to observe the status
try {
  await pulse.connect()
  console.log('connected, status:', pulse.status.value)
} catch (err) {
  if (err instanceof PulseConnectionError) {
    console.log('connection failed:', err.message)
  }
}

console.log('channel name:', chat.name)
console.log('channel disposed?', chat.disposed)

// Disposing a channel removes it from re-subscription tracking
chat.dispose()
console.log('channel disposed, pulse still running:', !pulse.disposed)

pulse.dispose()`,
  name: 'Reconnect & Restoration',
};
