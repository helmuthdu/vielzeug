export const testBusExample = {
  code: `import { createTestBus } from '@vielzeug/herald/testing'

// TestBus wraps a normal bus with emission recording — no mocking required
const bus = createTestBus()

bus.on('cart:updated', (cart) => console.log('handler saw total:', cart.total))

bus.emit('cart:updated', { items: 1, total: 19.99 })
bus.emit('cart:updated', { items: 2, total: 39.98 })
bus.emit('user:logout')

console.log('emitted count:', bus.emittedCount('cart:updated')) // 2
console.log('all payloads:', bus.emitted('cart:updated'))
console.log('every recorded event:', bus.allEmitted())

// removeAllListeners() stops delivery but keeps the historical records
bus.removeAllListeners('cart:updated')
bus.emit('cart:updated', { items: 3, total: 59.97 }) // no handler output, still recorded

console.log('after removeAllListeners:', bus.emitted('cart:updated'))

bus.dispose()`,
  name: 'createTestBus()',
};
