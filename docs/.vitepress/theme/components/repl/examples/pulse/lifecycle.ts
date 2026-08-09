export const lifecycleExample = {
  code: `import { createPulse, PulseDisposedError } from '@vielzeug/pulse'

// Status signal, disposalSignal, and error handling on dispose
const pulse = createPulse('wss://api.example.com/ws', {
  reconnect: { delay: 1_000, maxAttempts: 3 },
  heartbeat: { interval: 30_000, timeout: 5_000 },
  onError: (error) => console.log('Pulse error:', error.message),
})

// Construction is closed. connect() makes the transport available.
console.log('initial status:', pulse.status.value)

// disposalSignal aborts when dispose() is called
pulse.disposalSignal.addEventListener('abort', () => {
  console.log('disposal signal fired')
})

try {
  await pulse.connect()
  console.log('connected:', pulse.status.value)
} catch (err) {
  console.log('connect failed:', err.message)
}

// dispose() is idempotent — safe to call multiple times
pulse.dispose()
pulse.dispose()
console.log('disposed:', pulse.disposed)

// Methods reject with PulseDisposedError after dispose
try {
  await pulse.connect()
} catch (err) {
  if (err instanceof PulseDisposedError) {
    console.log('connect() rejected with PulseDisposedError — correct')
  }
}`,
  name: 'Lifecycle & Disposal',
};
