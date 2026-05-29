export const guardsAndActionsExample = {
  code: `import { defineMachine, interpret, assign } from '/machine'

const SECRET_KEY = 'vielzeug'

const doorMachine = defineMachine({
  initial: 'closed',
  context: { accessAttempts: 0 },
  states: {
    closed: {
      on: {
        OPEN: [{ target: 'open' }],
        LOCK: [{ target: 'locked' }],
      },
    },
    open: {
      on: {
        CLOSE: [{ target: 'closed' }],
      },
    },
    locked: {
      on: {
        UNLOCK: [
          {
            // Correct key: unlock and reset counter
            guard: ({ event }) => event.key === SECRET_KEY,
            target: 'closed',
            actions: [assign(() => ({ accessAttempts: 0 }))],
          },
          {
            // Wrong key: stay locked, record attempt
            guard: ({ event }) => event.key !== SECRET_KEY,
            target: 'locked',
            actions: [assign(({ context }) => ({ accessAttempts: context.accessAttempts + 1 }))],
          },
        ],
      },
    },
  },
})

const door = interpret(doorMachine)

door.send({ type: 'LOCK' })
console.log('State:', door.state.value)          // 'locked'

door.send({ type: 'UNLOCK', key: 'wrong' })
console.log('After wrong key:', door.state.value)        // 'locked'
console.log('Attempts:', door.context.value.accessAttempts) // 1

door.send({ type: 'UNLOCK', key: SECRET_KEY })
console.log('After correct key:', door.state.value)      // 'closed'
console.log('Attempts reset:', door.context.value.accessAttempts) // 0

// can() checks whether an event is accepted in the current state
console.log('Can OPEN now?', door.can({ type: 'OPEN' })) // true`,
  name: 'Guards & Actions',
};
