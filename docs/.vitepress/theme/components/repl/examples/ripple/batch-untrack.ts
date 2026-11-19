export const batchUntrackExample = {
  code: `import { batch, effect, signal, untrack } from '@vielzeug/ripple'

// Batch coalesces updates; untrack reads current state without subscribing.
const first = signal('Ada')
const last = signal('Lovelace')
const locale = signal('en-US')

const stop = effect(() => {
  const name = first.value + ' ' + last.value
  const currentLocale = untrack(() => locale.value)
  console.log({ name, currentLocale })
})

batch(() => {
  first.value = 'Grace'
  last.value = 'Hopper'
})
locale.value = 'de-DE'

stop.dispose()
`,
  name: 'Batch & Untrack',
};
