export const behaviorBusExample = {
  code: `import { createBehaviorBus } from '@vielzeug/herald'

// BehaviorBus replays the last value to new subscribers — like BehaviorSubject
const bus = createBehaviorBus({ theme: 'light', zoom: 1 })

// First subscriber receives current values immediately
bus.on('theme', (t) => console.log('A sees theme:', t))
bus.on('zoom', (z) => console.log('A sees zoom:', z))

bus.emit('theme', 'dark')

// Late subscriber gets the current value on registration
bus.on('theme', (t) => console.log('B sees theme:', t))

// Read current value without subscribing
console.log('current theme:', bus.current('theme'))
console.log('current zoom:', bus.current('zoom'))

// reset() clears the buffer — B will no longer replay
bus.reset('zoom')
console.log('after reset, zoom:', bus.current('zoom')) // undefined

bus.dispose()`,
  name: 'Behavior Bus',
};
