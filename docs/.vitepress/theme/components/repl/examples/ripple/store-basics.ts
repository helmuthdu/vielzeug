export const storeBasicsExample = {
  code: `import { store, computed, watch } from '@vielzeug/ripple'

// Create an object-state store
const user = store({ name: 'Alice', age: 30, email: 'alice@example.com' })

console.log('Initial:', user.peek())

// Shallow-merge partial updates
user.patch({ age: 31 })
console.log('After patch:', user.peek())

// Derive next state via function
user.replace((s) => ({ ...s, name: 'Alice Smith' }))
console.log('After replace:', user.peek())

// Omitting a key from the returned object actually removes it — not just sets it to undefined
user.replace((s) => { const { email, ...rest } = s; return rest })
console.log('After removing email:', user.peek(), 'has email:', Object.hasOwn(user.peek(), 'email'))

// lens() — writable Signal scoped to a path
const nameLens = user.lens('name')
console.log('Name via lens:', nameLens.value)
nameLens.value = 'Alice Jones'
console.log('After lens write:', user.peek().name)

// computed() — read-only projection of a signal or lens
const ageLens = user.lens('age')
const greeting = computed(() => \`\${nameLens.value} (age \${ageLens.value})\`)
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
console.log('After reset:', user.peek())`,
  name: 'Store — patch, lens & computed',
};
