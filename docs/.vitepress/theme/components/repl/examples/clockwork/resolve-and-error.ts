export const resolveAndErrorExample = {
  code: `import { machine, resolveTransition, MachineError } from '@vielzeug/clockwork'

// resolveTransition is a pure function — no side effects, no state change.
// Use it to inspect transition logic in tests or decision UIs.

const lockConfig = {
  context: { role: 'guest' },
  initial: 'locked',
  states: {
    locked: {
      on: {
        UNLOCK: [
          {
            guard: ({ context }) => context.role === 'admin',
            target: 'unlocked',
          },
          {
            target: 'locked', // fallthrough — stays locked for non-admins
          },
        ],
      },
    },
    unlocked: {
      on: { LOCK: { target: 'locked' } },
    },
  },
}

// --- Pure resolution with onGuard tracing ---
const guardLog = []

const result = resolveTransition(
  lockConfig,
  { context: { role: 'guest' }, event: { type: 'UNLOCK' }, state: 'locked' },
  ({ passed, target }) => {
    guardLog.push(\`guard → \${target}: \${passed ? 'passed' : 'blocked'}\`)
  },
)

console.log('Resolved target:', result?.target)  // 'locked' (fallthrough)
console.log('Guard log:', guardLog)
// ['guard → unlocked: blocked', 'guard → locked: passed']

// --- MachineError.is() for safe error handling ---
try {
  machine({
    initial: 'missing',
    states: { idle: {} },
  })
} catch (err) {
  if (MachineError.is(err)) {
    console.log('Error code:', err.code)     // 'MACHINE_INVALID_INITIAL_STATE'
    console.log('Details:', err.details)
  }
}

// --- using declaration — auto-dispose on scope exit ---
{
  using m = machine(lockConfig, { snapshot: { context: { role: 'admin' }, state: 'locked' } })
  m.send({ type: 'UNLOCK' })
  console.log('Admin unlocked:', m.state.value)  // 'unlocked'
} // m.dispose() called automatically`,
  name: 'resolveTransition + MachineError.is()',
};
