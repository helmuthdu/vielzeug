export const resolveAndErrorExample = {
  code: `import { ClockworkError, defineMachine } from '@vielzeug/clockwork'

const machine = defineMachine()({
  context: { role: 'guest' },
  initial: 'locked',
  states: {
    locked: {
      on: {
        UNLOCK: {
          guard: ({ context }) => context.role === 'admin',
          target: 'unlocked',
        },
      },
    },
    unlocked: { on: { LOCK: { target: 'locked' } } },
  },
})

// Pure transition: no actor, effects, or mutation.
const result = machine.transition(
  { context: { role: 'guest' }, state: 'locked' },
  { type: 'UNLOCK' },
)
console.log('Guest result:', result.type)

for (const definition of [
  { initial: 'missing', states: { idle: {} } },
  { context: [], initial: 'idle', states: { idle: {} } },
]) {
  try {
    defineMachine()(definition)
  } catch (error) {
    if (ClockworkError.is(error)) {
      console.log('Validation code:', error.code)
      console.log('Details:', error.details)
    }
  }
}`,
  name: 'Pure Transitions & Errors',
};
