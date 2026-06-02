export const asyncWaitExample = {
  code: `import { createBus } from '@vielzeug/herald'

// Await a single event with wait(), race multiple with waitAny()
const bus = createBus()

// Emit after a short delay
setTimeout(() => bus.emit('user:login', { userId: '42', email: 'alice@example.com' }), 50)
setTimeout(() => bus.emit('theme:change', 'dark'), 80)

// wait() resolves on the next emit of that event
const loginPayload = await bus.wait('user:login')
console.log('got login:', loginPayload.userId)

// Reset and race two events — whichever fires first wins
setTimeout(() => bus.emit('user:login', { userId: '1', email: 'a@b.com' }), 20)
setTimeout(() => bus.emit('theme:change', 'light'), 60)

const result = await bus.waitAny(['user:login', 'theme:change'])

if (result.event === 'user:login') {
  console.log('login won the race:', result.payload.userId)
} else {
  console.log('theme won the race:', result.payload)
}

bus.dispose()`,
  name: 'Async wait()',
};
