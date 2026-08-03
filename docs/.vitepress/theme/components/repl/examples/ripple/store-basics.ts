export const storeBasicsExample = {
  code: `import { createRipple } from '@vielzeug/ripple'

// Store keeps immutable object updates explicit.
const ripple = createRipple()
const user = ripple.createStore({ name: 'Ada', visits: 0 })
const greeting = ripple.computed(() => user.value.name + ': ' + user.value.visits)

const stop = ripple.effect(() => console.log(greeting.value))

user.update((state) => ({ ...state, visits: state.visits + 1 }))
user.set({ name: 'Grace', visits: 5 })

stop.dispose()
ripple.dispose()`,
  name: 'Immutable Store',
};
