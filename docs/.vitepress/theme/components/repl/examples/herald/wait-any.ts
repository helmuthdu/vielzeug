export const waitAnyExample = {
  code: `import { createBus } from '@vielzeug/herald'

// waitAny resolves with { event, payload } for whichever event fires first
const bus = createBus()

async function watchNextSessionEvent() {
  console.log('waiting for first session event...')

  const result = await bus.waitAny(['user:login', 'user:logout', 'session:expired'])

  if (result.event === 'user:login') {
    console.log('login:', result.payload.email, '(id:', result.payload.userId + ')')
  } else if (result.event === 'session:expired') {
    console.log('session expired:', result.payload.reason)
  } else {
    console.log('user logged out')
  }
}

void watchNextSessionEvent()

setTimeout(() => {
  bus.emit('user:login', { email: 'alice@example.com', userId: '42' })
  bus.emit('user:logout') // ignored — waitAny already resolved
}, 30)`,
  name: 'waitAny()',
};
