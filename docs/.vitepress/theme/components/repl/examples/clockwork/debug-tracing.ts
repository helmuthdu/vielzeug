export const debugTracingExample = {
  code: `import { debugMachine } from '@vielzeug/clockwork/devtools'

// Debug wrapper logs each dispatch result and committed snapshot.
const machine = debugMachine({
  initial: 'pending',
  states: {
    pending: { on: { SUBMIT: { target: 'confirmed' } } },
    confirmed: { on: { PAY: { target: 'paid' } } },
    paid: {},
  },
})

const actor = machine.createActor()
const history = []
const stop = actor.subscribe((snapshot) => history.push(snapshot.state))
actor.send({ type: 'SUBMIT' })
actor.send({ type: 'PAY' })
console.log('Final state:', actor.snapshot.value.state)
console.log('History:', history)
stop()
actor.dispose()`,
  name: 'Debug Machine',
};
