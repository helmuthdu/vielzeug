export const entryExitActionsExample = {
  code: `import { machine } from '@vielzeug/clockwork'

// Track side effects with entry/exit actions
const log = (msg) => console.log(msg)

const conn = machine({
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
        onDone:  (url,   _ctx) => ({ type: 'CONNECTED',   url }),
        onError: (error, _ctx) => ({ type: 'CONNECT_FAIL', error: String(error) }),
      }],
      on: {
        CONNECTED:    { target: 'connected',    actions: [({ context }) => { context.lastError = '' }] },
        CONNECT_FAIL: { target: 'disconnected', actions: [({ context, event }) => { context.lastError = event.error }] },
      },
    },
    connected: {
      entry: ({ context }) => log('[connected] entry: ready (reconnects: ' + context.reconnects + ')'),
      exit:  () => log('[connected] exit:  connection lost'),
      on: {
        DISCONNECT: { target: 'disconnected' },
        ERROR: {
          target: 'connecting',
          actions: [({ context }) => { context.reconnects += 1 }],
        },
      },
    },
  },
})

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
