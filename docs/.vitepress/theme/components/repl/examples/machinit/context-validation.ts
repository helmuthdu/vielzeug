export const contextValidationExample = {
  code: `import { defineMachine, interpret, assign, MachinitError } from '@vielzeug/machinit'

// Context validator — called on init and after every transition
function isValidProfile(ctx) {
  return (
    typeof ctx === 'object' && ctx !== null &&
    typeof ctx.username === 'string' &&
    typeof ctx.age === 'number' &&
    ctx.age >= 0 &&
    Array.isArray(ctx.tags)
  )
}

const profileMachine = defineMachine({
  initial: 'idle',
  context: { username: 'guest', age: 0, tags: [] },
  validateContext: isValidProfile,
  states: {
    idle: {
      on: {
        UPDATE: [{
          target: 'idle',
          actions: [assign(({ event }) => ({
            username: event.username ?? 'guest',
            age:      event.age      ?? 0,
            tags:     event.tags     ?? [],
          }))],
        }],
        ACTIVATE: [{ target: 'active', guard: ({ context }) => context.username !== 'guest' }],
      },
    },
    active: {
      on: {
        DEACTIVATE: [{ target: 'idle' }],
      },
    },
  },
})

const m = interpret(profileMachine)
console.log('Initial:', m.state.value, JSON.stringify(m.context.value))

// Valid update
m.send({ type: 'UPDATE', username: 'alice', age: 30, tags: ['admin'] })
console.log('After UPDATE:', JSON.stringify(m.context.value))

// Guard blocks ACTIVATE for guest user
const guest = interpret(profileMachine)
const activated = guest.send({ type: 'ACTIVATE' })
console.log('Guest activated?', activated)          // false — guard blocked it
console.log('State still:', guest.state.value)      // 'idle'

// Validator catches bad snapshots on restore
try {
  interpret(profileMachine, {
    snapshot: { state: 'idle', context: { username: 123, age: -1, tags: null } },
    validateSnapshot: isValidProfile,
  })
} catch (err) {
  console.log('Snapshot rejected:', err instanceof MachinitError, err.code)
}`,
  name: 'Context Validation',
};
