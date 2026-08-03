export const batchUntrackExample = {
  code: `import { createRipple } from '@vielzeug/ripple'

// Batch coalesces updates; untrack reads current state without subscribing.
const ripple = createRipple()
const first = ripple.signal('Ada')
const last = ripple.signal('Lovelace')
const locale = ripple.signal('en-US')

const stop = ripple.effect(() => {
  const name = first.value + ' ' + last.value
  const currentLocale = ripple.untrack(() => locale.value)
  console.log({ name, currentLocale })
})

ripple.batch(() => {
  first.value = 'Grace'
  last.value = 'Hopper'
})
locale.value = 'de-DE'

stop.dispose()
ripple.dispose()`,
  name: 'Batch & Untrack',
};
