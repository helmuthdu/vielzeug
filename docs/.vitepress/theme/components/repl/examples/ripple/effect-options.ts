export const effectOptionsExample = {
  code: `import { signal, effect, batch } from '/ripple'

const count = signal(0)

// scheduler: 'microtask' — re-runs coalesce and fire after the current task
const stop = effect(
  () => console.log('[microtask] count:', count.value),
  { scheduler: 'microtask', name: 'count-logger' },
)

count.value = 1
count.value = 2
count.value = 3
// All three writes queue one microtask re-run → logs "count: 3"

// With sync scheduler (default), every write triggers immediately
const stopSync = effect(
  () => console.log('[sync] count:', count.value),
  { scheduler: 'sync' },
)

count.value = 4  // → logs "[sync] count: 4" immediately
count.value = 5  // → logs "[sync] count: 5" immediately

// batch() still coalesces sync effects
batch(() => {
  count.value = 10
  count.value = 20
})
// → logs "[sync] count: 20" once

stopSync()
stop()`,
  name: 'Effect Options — scheduler',
};
