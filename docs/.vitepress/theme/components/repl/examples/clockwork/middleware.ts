export const interceptorsExample = {
  code: `import { createMachine } from '@vielzeug/clockwork'

// Authorize and log at event boundary, then send accepted domain events.
const machine = createMachine({
  initial: 'idle',
  states: {
    idle: { on: { START: { target: 'active' } } },
    active: { on: { RESET: { target: 'idle' } } },
  },
})

const actor = machine.createActor()
const dispatch = (event) => {
  console.log('[event]', event.type)
  if (event.type === 'RESET' && !event.authorised) return 'denied'
  return actor.send(event)
}

console.log(dispatch({ type: 'START' }))
console.log(dispatch({ type: 'RESET', authorised: false }))
console.log(actor.snapshot.value.state)`,
  name: 'Event Boundary',
};
