export const errorHandlingExample = {
  code: `import { createBus, HeraldError } from '@vielzeug/herald'

// onError captures listener throws — every listener still runs, even a buggy one
const errors = []

const bus = createBus({
  onError: ({ err, event }) => errors.push({ event, message: err.message }),
})

bus.on('order:placed', () => console.log('confirmation email sent'))
bus.on('order:placed', () => {
  throw new Error('inventory check failed')
})
bus.on('order:placed', () => console.log('analytics event recorded')) // still runs

bus.emit('order:placed', { id: 'ORD-1', total: 49.99 })

console.log('captured errors:', errors)
// [{ event: 'order:placed', message: 'inventory check failed' }]

// Without onError, the first error rethrows once every listener has run —
// HeraldError.is() catches it without importing every herald error subclass
try {
  bus.waitAny(['event-a']) // waitAny requires at least 2 event keys
} catch (err) {
  console.log('caught herald error?', HeraldError.is(err), '-', err.message)
}

bus.dispose()`,
  name: 'Error Handling',
};
