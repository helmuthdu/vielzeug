export const namedBusExample = {
  code: `import { createBus } from '@vielzeug/herald'

// name appears in log prefixes and BusDisposedError messages
const logs = []
const warns = []

const authBus = createBus({
  name: 'auth',
  logger: {
    debug: (msg) => { logs.push(msg); console.log(msg) },
    warn: (msg) => warns.push(msg),
  },
  maxListeners: 1,
})

authBus.on('login', (userId) => console.log('user:', userId))
authBus.on('login', (userId) => console.log('audit:', userId)) // triggers warn

authBus.emit('login', 'alice')

const pending = authBus.wait('logout')
authBus.dispose()

pending.catch((err) => {
  console.log('error name:', err.name)
  console.log('error message:', err.message)
  console.log('warn included name:', warns[0].includes('auth'))
})`,
  name: 'Named Bus',
};
