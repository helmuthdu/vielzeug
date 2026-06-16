export const pipeEventsExample = {
  code: `import { createBus, pipeEvents } from '@vielzeug/herald'

// pipeEvents forwards a subset of events from one bus to another
const appBus = createBus()
const auditBus = createBus()

// auditBus only receives auth events, not cart events
auditBus.on('user:login', ({ email, userId }) => {
  console.log('[audit] login:', email, '(id:', userId + ')')
})
auditBus.on('user:logout', () => {
  console.log('[audit] logout recorded')
})

const controller = new AbortController()
const unpipe = pipeEvents(appBus, auditBus, ['user:login', 'user:logout'], { signal: controller.signal })

appBus.emit('user:login', { email: 'alice@example.com', userId: '1' })
appBus.emit('cart:updated', { total: 99 })  // not forwarded
appBus.emit('user:logout')

unpipe() // stop forwarding

appBus.emit('user:login', { email: 'bob@example.com', userId: '2' }) // not forwarded
console.log('auditBus listeners after unpipe:', auditBus.listenerCount())`,
  name: 'pipeEvents()',
};
