export const contextValidationExample = {
  code: `import { createMachine } from '@vielzeug/clockwork'

// Validate external data before using it as an actor snapshot.
const isProfile = (value) =>
  typeof value === 'object' && value !== null &&
  typeof value.username === 'string' && typeof value.age === 'number'

const machine = createMachine({
  context: { age: 0, username: 'guest' },
  initial: 'idle',
  states: {
    idle: {
      on: {
        UPDATE: {
          reduce: ({ event }) => ({ age: event.age, username: event.username }),
          target: 'idle',
        },
      },
    },
  },
})

const candidate = { context: { age: 30, username: 'alice' }, state: 'idle' }
const actor = machine.createActor({ snapshot: isProfile(candidate.context) ? candidate : undefined })
console.log(actor.snapshot.value)`,
  name: 'External Snapshot Validation',
};
