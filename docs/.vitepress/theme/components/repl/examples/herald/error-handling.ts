export const errorHandlingExample = {
  code: `import { createBus, HeraldError } from '@vielzeug/herald'

// tap() captures every listener error; emit() rethrows the first after all listeners run
const errors = []

const bus = createBus()

bus.tap((event) => {
  if (event.type === 'error') {
    errors.push({ event: event.event, message: event.error instanceof Error ? event.error.message : String(event.error) })
  }
})

bus.on('order:placed', () => console.log('confirmation email sent'))
bus.on('order:placed', () => {
  throw new Error('inventory check failed')
})
bus.on('order:placed', () => console.log('analytics event recorded')) // still runs

try {
  bus.emit('order:placed', { id: 'ORD-1', total: 49.99 })
} catch (err) {
  console.log('first error rethrown:', err.message)
}

console.log('captured errors:', errors)
// [{ event: 'order:placed', message: 'inventory check failed' }]

try {
  bus.waitAny(['event-a']) // waitAny requires at least 2 event keys
} catch (err) {
  console.log('caught herald error?', err instanceof HeraldError, '-', err.message)
}

bus.dispose()`,
  name: 'Error Handling',
};
