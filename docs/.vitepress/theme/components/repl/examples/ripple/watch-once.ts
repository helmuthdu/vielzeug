export const watchOnceExample = {
  code: `import { signal, watch } from '@vielzeug/ripple'

// once:true — auto-disposes after the first callback invocation
const status = signal('idle')

watch(status, (next) => {
  console.log('First change:', next)
  // subscription auto-disposed here — no further calls
}, { once: true })

status.value = 'loading' // → 'First change: loading'
status.value = 'ready'   // silent — already disposed

// Combine with immediate:true to react to the current value then stop
const count = signal(5)

watch(count, (v) => console.log('Snapshot:', v), { immediate: true, once: true })
// → 'Snapshot: 5' (fires immediately, then auto-disposes)

count.value = 6 // silent — already disposed`,
  name: 'watch — once',
};
