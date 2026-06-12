export const loggerOptionExample = {
  code: `import { createBus } from '@vielzeug/herald'

// Custom logger — route or suppress debug and warn output
const logs = []

const bus = createBus({
  maxListeners: 2,
  logger: {
    debug: (msg) => logs.push('[debug] ' + msg),
    warn:  (msg) => logs.push('[warn]  ' + msg),
  },
})

bus.on('order:placed', (order) => console.log('order:', order.id))
bus.on('order:placed', (order) => console.log('copy:', order.id))
bus.on('order:placed', () => {}) // triggers maxListeners warning (> 2)

bus.emit('order:placed', { id: 'ORD-001', total: 49.99 })

bus.dispose()

console.log('captured log lines:')
logs.forEach((l) => console.log(l))`,
  name: 'Custom Logger',
};
