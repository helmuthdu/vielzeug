export const behaviorSnapshotExample = {
  code: `import { createBehaviorBus } from '@vielzeug/herald'

// snapshot() reads all buffered values at once — useful for serialization
// and hydrating another bus or UI from the current state

const bus = createBehaviorBus({ theme: 'light', zoom: 1, sidebar: true })

console.log('initial snapshot:', bus.snapshot())
// { theme: 'light', zoom: 1, sidebar: true }

bus.emit('theme', 'dark')
bus.emit('zoom', 2)

console.log('after emits:', bus.snapshot())
// { theme: 'dark', zoom: 2, sidebar: true }

// Hydrate a new bus from the snapshot
const saved = bus.snapshot()
const restored = createBehaviorBus(saved)

console.log('restored theme:', restored.current('theme')) // 'dark'
console.log('restored zoom:', restored.current('zoom'))   // 2

// reset() only clears entries you choose
bus.reset('zoom')
console.log('after reset zoom:', bus.snapshot())
// { theme: 'dark', sidebar: true }  — zoom is gone

bus.dispose()
restored.dispose()`,
  name: 'BehaviorBus snapshot()',
};
