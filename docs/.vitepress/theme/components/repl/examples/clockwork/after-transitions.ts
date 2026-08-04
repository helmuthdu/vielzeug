export const afterTransitionsExample = {
  code: `import { defineMachine } from '@vielzeug/clockwork'

// Timers begin on entry and cancel automatically on exit or disposal.
const machine = defineMachine()({
  context: { message: '' },
  initial: 'hidden',
  states: {
    hidden: {
      on: {
        SHOW: {
          reduce: ({ event }) => ({ message: event.message }),
          target: 'visible',
        },
      },
    },
    visible: {
      after: [{ delay: 500, target: 'hidden' }],
      on: { DISMISS: { target: 'hidden' } },
    },
  },
})

const actor = machine.createActor()
actor.send({ type: 'SHOW', message: 'Saved' })
console.log('Visible:', actor.snapshot)
setTimeout(() => console.log('After timer:', actor.snapshot), 700)`,
  name: 'Delayed Transitions',
};
