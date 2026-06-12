export const hierarchicalStatesExample = {
  code: `import { defineMachine, interpret } from '@vielzeug/clockwork'

// Compound states: a parent state with nested substates
const playerMachine = defineMachine({
  initial: 'idle',
  context: { trackTitle: '' },
  states: {
    idle: {
      on: { PLAY: { target: 'playing' } },
    },
    playing: {
      initial: 'normal',
      on: {
        // Parent-level event — exits playing entirely
        STOP: { target: 'idle' },
      },
      states: {
        normal: {
          on: {
            FAST_FORWARD: { target: 'playing.fast' },
          },
        },
        fast: {
          on: {
            NORMAL: { target: 'playing.normal' },
          },
        },
      },
    },
  },
})

const m = interpret(playerMachine)

console.log('State:', m.state.value)          // 'idle'

m.send({ type: 'PLAY' })
console.log('State:', m.state.value)          // 'playing.normal'

// matches() checks ancestor states too
console.log('Is playing?', m.matches('playing'))        // true
console.log('Is normal?', m.matches('playing.normal'))  // true
console.log('Is fast?', m.matches('playing.fast'))      // false

m.send({ type: 'FAST_FORWARD' })
console.log('State:', m.state.value)          // 'playing.fast'
console.log('Is playing?', m.matches('playing'))        // true

// Parent-level STOP event works from any substate
m.send({ type: 'STOP' })
console.log('State:', m.state.value)          // 'idle'`,
  name: 'Hierarchical States',
};
