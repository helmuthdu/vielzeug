export const watchAndSubscribeExample = {
  code: `import { computed, createScope, signal, watch } from '@vielzeug/ripple'

// Watch receives selected value transitions, not every graph update.
const scope = createScope()
const first = signal('Ada')
const last = signal('Lovelace')
const fullName = scope.run(() => computed(() => first.value + ' ' + last.value))

const stop = watch(fullName, (value, previous) => {
  console.log({ previous, value })
}, { immediate: true })

first.value = 'Grace'
last.value = 'Hopper'

stop.dispose()
scope.dispose()`,
  name: 'Watch Selected Value',
};
