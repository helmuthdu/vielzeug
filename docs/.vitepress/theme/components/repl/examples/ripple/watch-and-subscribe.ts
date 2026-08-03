export const watchAndSubscribeExample = {
  code: `import { createRipple } from '@vielzeug/ripple'

// Watch receives selected value transitions, not every graph update.
const ripple = createRipple()
const first = ripple.signal('Ada')
const last = ripple.signal('Lovelace')
const fullName = ripple.computed(() => first.value + ' ' + last.value)

const stop = ripple.watch(fullName, (value, previous) => {
  console.log({ previous, value })
}, { immediate: true })

first.value = 'Grace'
last.value = 'Hopper'

stop.dispose()
ripple.dispose()`,
  name: 'Watch Selected Value',
};
