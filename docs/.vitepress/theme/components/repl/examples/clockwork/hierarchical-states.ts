export const hierarchicalStatesExample = {
  code: `import { createMachine } from '@vielzeug/clockwork'

// Use explicit flat state names instead of compound state paths.
const machine = createMachine({
  initial: 'idle',
  states: {
    idle: { on: { PLAY: { target: 'playingNormal' } } },
    playingNormal: {
      on: {
        FAST_FORWARD: { target: 'playingFast' },
        STOP: { target: 'idle' },
      },
    },
    playingFast: {
      on: {
        NORMAL: { target: 'playingNormal' },
        STOP: { target: 'idle' },
      },
    },
  },
})

const actor = machine.createActor()
actor.send({ type: 'PLAY' })
actor.send({ type: 'FAST_FORWARD' })
console.log(actor.snapshot.value.state)`,
  name: 'Flat Workflow States',
};
