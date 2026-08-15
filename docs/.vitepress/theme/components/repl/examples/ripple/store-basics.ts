export const storeBasicsExample = {
  code: `import { createRipple } from '@vielzeug/ripple'

// signal.update keeps immutable object updates explicit.
const ripple = createRipple()
const user = ripple.signal({ name: 'Ada', visits: 0 })
const greeting = ripple.computed(() => user.value.name + ': ' + user.value.visits)

const stop = ripple.effect(() => console.log(greeting.value))

user.update((state) => ({ ...state, visits: state.visits + 1 }))
user.value = { name: 'Grace', visits: 5 }

stop.dispose()
ripple.dispose()`,
  name: 'Immutable State',
};
