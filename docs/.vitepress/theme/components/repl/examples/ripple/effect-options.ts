export const effectOptionsExample = {
  code: `import { createRipple } from '@vielzeug/ripple'

// Microtask effects coalesce writes until current task ends.
const ripple = createRipple()
const count = ripple.signal(0)
const stop = ripple.effect(
  () => console.log('count:', count.value),
  { name: 'count logger', scheduler: 'microtask' },
)

count.value = 1
count.value = 2
count.value = 3
console.log('writes complete')

queueMicrotask(() => {
  stop.dispose()
  ripple.dispose()
})`,
  name: 'Microtask Effect',
};
