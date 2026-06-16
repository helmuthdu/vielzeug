export const channelsExample = {
  code: `import { createPulse } from '@vielzeug/pulse'

// Isolated channel namespace — listeners and sends are scoped to 'chat'
const pulse = createPulse('wss://api.example.com/ws')
const chat = pulse.channel('chat')

// Listeners scoped to the channel
chat.on('message', ({ from, text }) => {
  console.log('[chat] ' + from + ': ' + text)
})

// Send scoped to the channel
chat.send('send', { text: 'hey!' })

// Wait with a per-event timeout
try {
  const msg = await chat.wait('message', { timeout: 3_000 })
  console.log('got:', msg.text)
} catch (err) {
  console.log('channel wait timed out:', err.message)
}

// Disposing the channel removes all its listeners
// but the underlying pulse connection stays open
chat.dispose()
console.log('channel disposed, pulse still open:', pulse.status.value)

pulse.dispose()`,
  name: 'Typed Channels',
};
