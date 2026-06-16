export const lifecycleExample = {
  code: `import { createPulse, DisposedError } from '@vielzeug/pulse'

// Status signal, disposalSignal, and error handling on dispose
const pulse = createPulse('wss://api.example.com/ws', {
  reconnect: { delay: 1_000, maxAttempts: 3 },
  heartbeat: { interval: 30_000, timeout: 5_000 },
  onOpen:  () => console.log('connected'),
  onClose: (code, reason) => console.log('closed', code, reason),
})

// status is a reactive signal: 'connecting' | 'open' | 'reconnecting' | 'closed'
console.log('initial status:', pulse.status.value)

// disposalSignal aborts when dispose() is called
pulse.disposalSignal.addEventListener('abort', () => {
  console.log('disposal signal fired')
})

// dispose() is idempotent — safe to call multiple times
pulse.dispose()
pulse.dispose()
console.log('disposed:', pulse.disposed)

// Methods reject with DisposedError after dispose
try {
  await pulse.connect()
} catch (err) {
  if (err instanceof DisposedError) {
    console.log('connect() rejected with DisposedError — correct')
  }
}`,
  name: 'Lifecycle & Disposal',
};
