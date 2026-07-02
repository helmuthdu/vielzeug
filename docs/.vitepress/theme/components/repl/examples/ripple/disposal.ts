export const disposalExample = {
  code: `import { signal, computed, effect, readonly, scope, store } from '@vielzeug/ripple'

// ── store.dispose() ──────────────────────────────────────────────────────────
// Permanently releases all internal prop signals and cached lenses.
const cart = store({ count: 0, label: 'cart' }, { name: 'cart' })
const countLens = cart.lens('count')

console.log('lens.disposed before:', countLens.disposed) // false
cart.dispose() // or: using cart = store(...)
console.log('lens.disposed after:', countLens.disposed)  // true

// ── scope.disposed ────────────────────────────────────────────────────────────
// Useful for guarding async callbacks that may outlive their scope.
const s = scope()
console.log('scope.disposed before:', s.disposed) // false
s.dispose()
console.log('scope.disposed after:', s.disposed)  // true

// ── Reactive.name ───────────────────────────────────────────────────────
// .name is now on the Reactive interface — no cast or getSignalName() needed.
const counter = signal(0, { name: 'counter' })
const doubled = computed(() => counter.value * 2, { name: 'doubled' })
const ro = readonly(counter)

console.log('counter.name:', counter.name) // 'counter'
console.log('doubled.name:', doubled.name) // 'doubled'
console.log('readonly.name:', ro.name)    // 'counter' (delegates to source)

// ── Subscription.disposed ─────────────────────────────────────────────────────
const sub = effect(() => { console.log('count:', counter.value) })
console.log('sub.disposed before:', sub.disposed) // false
sub.dispose()
console.log('sub.disposed after:', sub.disposed)  // true

counter.dispose()
doubled.dispose()`,
  name: 'Disposal & .name',
};
