export const wildcardListenersExample = {
  code: `import { createBus } from '@vielzeug/herald'

type AppEvents = {
  'user:login': { userId: string }
  'user:logout': void
  'cart:updated': { items: number }
}

const bus = createBus<AppEvents>({ name: 'app' })

// onAny receives every event — useful for logging, analytics, tracing
const unsub = bus.onAny((event, payload) => {
  console.log('[audit]', event, payload)
})

console.log('wildcard listeners:', bus.wildcardCount()) // 1

bus.emit('user:login', { userId: 'alice' })
bus.emit('cart:updated', { items: 3 })
bus.emit('user:logout')

// Remove the wildcard listener
unsub()
console.log('after unsub:', bus.wildcardCount()) // 0

bus.dispose()`,
  name: 'onAny + wildcardCount()',
};
