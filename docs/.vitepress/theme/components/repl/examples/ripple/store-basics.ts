export const storeBasicsExample = {
  code: `import { store, computed, watch } from '@vielzeug/ripple'

// Create an object-state store
const user = store({ name: 'Alice', age: 30, email: 'alice@example.com' })

console.log('Initial:', user.value)

// Shallow-merge partial updates
user.patch({ age: 31 })
console.log('After patch:', user.value)

// Derive next state via function
user.replace((s) => ({ ...s, name: 'Alice Smith' }))
console.log('After replace:', user.value)

// lens() — writable Signal scoped to a path
const nameLens = user.lens('name')
console.log('Name via lens:', nameLens.value)
nameLens.value = 'Alice Jones'
console.log('After lens write:', user.value.name)

// .map() combinator — read-only derived slice
const greeting = user.map((s) => \`\${s.name} (age \${s.age})\`)
console.log('Greeting:', greeting.value)

// Watch a lens — only fires when that path changes
const stopWatch = watch(nameLens, (next, prev) => {
  console.log('name changed:', prev, '→', next)
})

user.patch({ age: 32 }) // does NOT fire (name unchanged)
nameLens.value = 'Bob'  // fires

stopWatch.dispose()
greeting.dispose()

// Reset to initial state
user.reset()
console.log('After reset:', user.value)`,
  name: 'Store — patch, lens & map',
};
