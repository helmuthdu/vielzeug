export const afterTransitionsExample = {
  code: `import { createMachine } from '@vielzeug/clockwork'

// Timers begin on entry and cancel automatically on exit or disposal.
const machine = createMachine({
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
console.log('Visible:', actor.snapshot.value)
setTimeout(() => console.log('After timer:', actor.snapshot.value), 700)`,
  name: 'Delayed Transitions',
};
