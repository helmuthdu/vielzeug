export const entryExitActionsExample = {
  code: `import { createMachine } from '@vielzeug/clockwork'

const log = (message) => console.log(message)

// Effects run after actor commits its immutable snapshot.
const machine = createMachine({
  context: { reconnects: 0 },
  initial: 'disconnected',
  states: {
    disconnected: {
      entry: [() => log('[disconnected] socket closed')],
      on: { CONNECT: { target: 'connected' } },
    },
    connected: {
      entry: [({ context }) => log('[connected] reconnects: ' + context.reconnects)],
      exit: [() => log('[connected] socket closing')],
      on: {
        DISCONNECT: { target: 'disconnected' },
        ERROR: {
          reduce: ({ context }) => ({ reconnects: context.reconnects + 1 }),
          target: 'disconnected',
        },
      },
    },
  },
})

const actor = machine.createActor()
actor.subscribe((snapshot) => console.log('Committed:', snapshot))
actor.send({ type: 'CONNECT' })
actor.send({ type: 'ERROR' })`,
  name: 'Post-commit Effects',
};
