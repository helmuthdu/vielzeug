export const interceptorsExample = {
  code: `import { createMachine } from '@vielzeug/clockwork'

// Interceptors are pure functions: return the event to allow, null to block.
// They run left-to-right; the first null wins.

// Interceptor 1: logger — always logs, then passes the event through
const logger = (event, snapshot) => {
  console.log('[log] ' + event.type + ' in ' + snapshot.state)
  return event
}

// Interceptor 2: auth guard — blocks RESET unless authorised
const authGuard = (event, _snapshot) => {
  if (event.type === 'RESET' && !event.authorised) {
    console.log('[auth] RESET blocked — not authorised')
    return null  // block
  }
  return event
}

const m = createMachine({
  initial: 'idle',
  context: { requests: 0, blocked: 0 },
  states: {
    idle:    { on: { START: { target: 'active' } } },
    active:  { on: { STOP:  { target: 'idle'   }, RESET: { target: 'idle' } } },
  },
}).start({ interceptors: [logger, authGuard] })

console.log(m.send({ type: 'START' }))     // 'transitioned'
// [log] START in idle
console.log('State:', m.state.value)       // 'active'

console.log(m.send({ type: 'RESET' }))    // 'rejected'
// [log] RESET in active
// [auth] RESET blocked — not authorised
console.log('State:', m.state.value)       // 'active' — unchanged

m.send({ type: 'RESET', authorised: true })
// [log] RESET in active
console.log('State:', m.state.value)       // 'idle'`,
  name: 'Interceptors',
};
