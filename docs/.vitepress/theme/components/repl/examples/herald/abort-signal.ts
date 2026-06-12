export const abortSignalExample = {
  code: `import { createBus, BusDisposedError } from '@vielzeug/herald'

// Demonstrate AbortSignal auto-unsubscribe and BusDisposedError
const bus = createBus()

const controller = new AbortController()
const { signal } = controller

bus.on('message', (msg) => {
  console.log('listener received:', msg)
}, { signal })

bus.emit('message', 'first')   // fires
bus.emit('message', 'second')  // fires

controller.abort()             // removes the listener

bus.emit('message', 'third')   // ignored — no listeners
console.log('listeners after abort:', bus.listenerCount())

// BusDisposedError: pending wait() rejects when bus is disposed
const bus2 = createBus()

void bus2.wait('done').catch((err) => {
  if (err instanceof BusDisposedError) {
    console.log('BusDisposedError caught:', err.message)
  }
})

bus2.dispose()`,
  name: 'AbortSignal & BusDisposedError',
};
