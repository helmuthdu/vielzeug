export const guardsAndActionsExample = {
  code: `import { createMachine } from '@vielzeug/clockwork'

const SECRET_KEY = 'vielzeug'

// Guards select a transition. Reducers return immutable replacement context.
const machine = createMachine({
  context: { accessAttempts: 0 },
  initial: 'locked',
  states: {
    locked: {
      on: {
        UNLOCK: [
          {
            guard: ({ event }) => event.key === SECRET_KEY,
            reduce: () => ({ accessAttempts: 0 }),
            target: 'unlocked',
          },
          {
            reduce: ({ context }) => ({ accessAttempts: context.accessAttempts + 1 }),
            target: 'locked',
          },
        ],
      },
    },
    unlocked: { on: { LOCK: { target: 'locked' } } },
  },
})

const actor = machine.createActor()
actor.send({ type: 'UNLOCK', key: 'wrong' })
console.log('Wrong key:', actor.snapshot.value)
actor.send({ type: 'UNLOCK', key: SECRET_KEY })
console.log('Correct key:', actor.snapshot.value)`,
  name: 'Guards & Reducers',
};
