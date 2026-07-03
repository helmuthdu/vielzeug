export const resolveAndErrorExample = {
  code: `import { createMachine, ClockworkError, ClockworkInvalidInitialStateError } from '@vielzeug/clockwork'

// .resolve() is a pure function on a MachineDefinition — no side effects, no state change.
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

const result = createMachine(lockConfig).resolve(
  { context: { role: 'guest' }, event: { type: 'UNLOCK' }, state: 'locked' },
  {
    onGuard: ({ passed, target }) => {
      guardLog.push(\`guard → \${target}: \${passed ? 'passed' : 'blocked'}\`)
    },
  },
)

console.log('Resolved target:', result?.target)  // 'locked' (fallthrough)
console.log('Guard log:', guardLog)
// ['guard → unlocked: blocked', 'guard → locked: passed']

// --- instanceof narrowing + ClockworkError.is() for safe error handling ---
try {
  createMachine({
    initial: 'missing',
    states: { idle: {} },
  }).start()
} catch (err) {
  if (err instanceof ClockworkInvalidInitialStateError) {
    // Narrowed to the specific subclass — its typed fields are available directly.
    console.log('Bad initial state:', err.initial)
    console.log('Fix: check that "initial" matches a key in "states"')
  } else if (ClockworkError.is(err)) {
    console.log('Some other clockwork validation error:', err.message)
  }
}

// --- using declaration — auto-dispose on scope exit ---
{
  using m = createMachine(lockConfig).start({ snapshot: { context: { role: 'admin' }, state: 'locked' } })
  m.send({ type: 'UNLOCK' })
  console.log('Admin unlocked:', m.state.value)  // 'unlocked'
} // m.dispose() called automatically`,
  name: 'resolve() + ClockworkError',
};
