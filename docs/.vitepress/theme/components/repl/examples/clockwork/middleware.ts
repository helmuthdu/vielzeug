export const middlewareExample = {
  code: `import { defineMachine, interpret } from '@vielzeug/clockwork'

const machine = defineMachine({
  initial: 'idle',
  context: { requests: 0, blocked: 0 },
  states: {
    idle:    { on: { START: { target: 'active' } } },
    active:  { on: { STOP:  { target: 'idle'   }, RESET: { target: 'idle' } } },
  },
})

// Middleware 1: logger — always logs, then passes event through
const logger = (event, snapshot, next) => {
  console.log('[log] ' + event.type + ' in ' + snapshot.state)
  return next()
}

// Middleware 2: auth guard — blocks RESET unless authorised
const authGuard = (event, _snapshot, next) => {
  if (event.type === 'RESET' && !event.authorised) {
    console.log('[auth] RESET blocked — not authorised')
    return false
  }
  return next()
}

const m = interpret(machine, { middleware: [logger, authGuard] })

m.send({ type: 'START' })
// [log] START in idle
console.log('State:', m.state.value)      // 'active'

m.send({ type: 'RESET' })
// [log] RESET in active
// [auth] RESET blocked — not authorised
console.log('State:', m.state.value)      // 'active' — unchanged

m.send({ type: 'RESET', authorised: true })
// [log] RESET in active
console.log('State:', m.state.value)      // 'idle'`,
  name: 'Middleware',
};
