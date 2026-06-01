export const disposalSignalExample = {
  code: `import { createBus } from '@vielzeug/herald'

// disposalSignal ties an external subscription's lifetime to this bus
const mainBus = createBus()
const childBus = createBus()

// Pass disposalSignal so the child listener is removed when mainBus disposes
childBus.on('data:update', ({ value }) => {
  console.log('child received:', value)
}, { signal: mainBus.disposalSignal })

console.log('child listeners before dispose:', childBus.listenerCount())

childBus.emit('data:update', { value: 10 })  // fires — listener is active

mainBus.dispose()  // disposalSignal fires — child listener auto-removed

console.log('child listeners after mainBus.dispose():', childBus.listenerCount())

childBus.emit('data:update', { value: 20 })  // no output — listener is gone
console.log('mainBus.disposed:', mainBus.disposed)
console.log('disposalSignal aborted:', mainBus.disposalSignal.aborted)`,
  name: 'disposalSignal',
};
