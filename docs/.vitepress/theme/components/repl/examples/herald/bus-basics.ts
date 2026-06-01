export const busBasicsExample = {
  code: `import { createBus } from '@vielzeug/herald'

// on() returns an unsubscribe handle; emit() delivers to all active listeners
const bus = createBus()

const unsubLogin = bus.on('user:login', (payload) => {
  console.log('login:', payload.name, '(' + payload.userId + ')')
})

bus.on('user:logout', () => console.log('logged out'))
bus.on('notification', (msg) => console.log('notification:', msg))

bus.emit('user:login', { userId: '123', name: 'Alice' })
bus.emit('notification', 'welcome back!')

unsubLogin()

bus.emit('user:login', { userId: '456', name: 'Bob' }) // no output — unsubscribed
console.log('active listeners:', bus.listenerCount())

bus.dispose()`,
  name: 'createBus - Basics',
};
