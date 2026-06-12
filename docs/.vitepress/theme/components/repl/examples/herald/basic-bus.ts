export const basicBusExample = {
  code: `import { createBus } from '@vielzeug/herald'

// Typed pub/sub with on(), emit(), and once()
const bus = createBus()

const unsub = bus.on('user:login', ({ userId, email }) => {
  console.log('login:', userId, email)
})

bus.once('user:logout', () => {
  console.log('logged out (fires once)')
})

bus.emit('user:login', { userId: '1', email: 'alice@example.com' })
bus.emit('user:logout')
bus.emit('user:logout') // once() already removed; no output

unsub()
bus.emit('user:login', { userId: '2', email: 'bob@example.com' }) // no output — unsubscribed

bus.dispose()`,
  name: 'Basic Bus',
};
