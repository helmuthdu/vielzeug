export const namedBusExample = {
  code: `import { createBus } from '@vielzeug/herald'

// name appears in BusDisposedError messages
const authBus = createBus({ name: 'auth', maxListeners: 1 })

authBus.on('login', (userId) => console.log('user:', userId))
authBus.on('login', (userId) => console.log('audit:', userId)) // triggers maxListeners warn

authBus.emit('login', 'alice')

const pending = authBus.wait('logout')
authBus.dispose()

pending.catch((err) => {
  console.log('error name:', err.name)
  console.log('error message:', err.message)
})`,
  name: 'Named Bus',
};
