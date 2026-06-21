export const contextValidationExample = {
  code: `import { createMachine, MachineError } from '@vielzeug/clockwork'

// Context validator — return true if valid, or a string error message if not
function isValidProfile(ctx) {
  if (typeof ctx !== 'object' || ctx === null) return 'context must be an object'
  if (typeof ctx.username !== 'string') return 'username must be a string'
  if (typeof ctx.age !== 'number' || ctx.age < 0) return 'age must be a non-negative number'
  if (!Array.isArray(ctx.tags)) return 'tags must be an array'
  return true
}

const profileConfig = {
  initial: 'idle',
  context: { username: 'guest', age: 0, tags: [] },
  validateContext: isValidProfile,
  states: {
    idle: {
      on: {
        UPDATE: {
          target: 'idle',
          actions: [({ context, event }) => {
            context.username = event.username ?? 'guest'
            context.age      = event.age      ?? 0
            context.tags     = event.tags     ?? []
          }],
        },
        ACTIVATE: { target: 'active', guard: ({ context }) => context.username !== 'guest' },
      },
    },
    active: {
      on: {
        DEACTIVATE: { target: 'idle' },
      },
    },
  },
}

const m = createMachine(profileConfig).start()
console.log('Initial:', m.state.value, JSON.stringify(m.context.value))

// Valid update
m.send({ type: 'UPDATE', username: 'alice', age: 30, tags: ['admin'] })
console.log('After UPDATE:', JSON.stringify(m.context.value))

// Guard blocks ACTIVATE for guest user
const guest = createMachine(profileConfig).start()
const activated = guest.send({ type: 'ACTIVATE' })
console.log('Guest activated?', activated.status)   // 'rejected' — guard blocked it
console.log('State still:', guest.state.value)      // 'idle'

// validateContext also runs when restoring a snapshot — bad context throws
try {
  createMachine(profileConfig).start({
    snapshot: { state: 'idle', context: { username: 123, age: -1, tags: null } },
  })
} catch (err) {
  console.log('Snapshot rejected:', err instanceof MachineError, err.code)
  // MachineError: MACHINE_INVALID_VALIDATE_CONTEXT
}`,
  name: 'Context Validation',
};
