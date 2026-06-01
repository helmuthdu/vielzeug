export const asyncGeneratorExample = {
  code: `import { createBus } from '@vielzeug/herald'

// events() returns an async generator that yields each emitted value in order
const bus = createBus()

async function consumeTicks() {
  let received = 0
  for await (const tick of bus.events('tick', { maxBuffer: 2 })) {
    console.log('tick:', tick)
    received++
    if (received >= 3) break
  }
  console.log('done after', received, 'ticks')
}

void consumeTicks()

let count = 0
const interval = setInterval(() => {
  bus.emit('tick', ++count)
  if (count >= 5) {
    clearInterval(interval)
    bus.dispose()
  }
}, 30)`,
  name: 'events() - Async Generator',
};
