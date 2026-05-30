export const entryExitActionsExample = {
  code: `import { defineMachine, interpret, assign } from '/clockwork'

// Track side effects with entry/exit actions
const log = (msg) => console.log(msg)

const connectionMachine = defineMachine({
  initial: 'disconnected',
  context: { reconnects: 0, lastError: '' },
  states: {
    disconnected: {
      entry: () => log('[disconnected] entry: socket closed'),
      on: {
        CONNECT: { target: 'connecting' },
      },
    },
    connecting: {
      entry: () => log('[connecting] entry: dialing server...'),
      exit:  () => log('[connecting] exit:  dial complete'),
      invoke: [{
        src: async () => {
          await new Promise(res => setTimeout(res, 200))
          return 'ws://localhost:3000'
        },
        onDone:  (url)   => ({ type: 'CONNECTED',   url }),
        onError: (error) => ({ type: 'CONNECT_FAIL', error: String(error) }),
      }],
      on: {
        CONNECTED:    { target: 'connected',    actions: [assign(() => ({ lastError: '' }))] },
        CONNECT_FAIL: { target: 'disconnected', actions: [assign(({ event }) => ({ lastError: event.error }))] },
      },
    },
    connected: {
      entry: ({ context }) => log('[connected] entry: ready (reconnects: ' + context.reconnects + ')'),
      exit:  () => log('[connected] exit:  connection lost'),
      on: {
        DISCONNECT: { target: 'disconnected' },
        ERROR: {
          target: 'connecting',
          actions: [assign(({ context }) => ({ reconnects: context.reconnects + 1 }))],
        },
      },
    },
  },
})

const conn = interpret(connectionMachine)

console.log('State:', conn.state.value)  // 'disconnected'
conn.send({ type: 'CONNECT' })
console.log('State:', conn.state.value)  // 'connecting'

setTimeout(() => {
  console.log('State:', conn.state.value)  // 'connected'

  // Simulate an error triggering reconnect
  conn.send({ type: 'ERROR' })
  console.log('State after error:', conn.state.value)  // 'connecting'
  console.log('Reconnects:', conn.context.value.reconnects)  // 1
}, 400)`,
  name: 'Entry & Exit Actions',
};
