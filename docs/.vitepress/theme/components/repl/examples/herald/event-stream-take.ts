export const eventStreamTakeExample = {
  code: `import { createBus } from '@vielzeug/herald'

// .take(n) closes the stream after yielding exactly n values
const bus = createBus()

async function collectFirstThree() {
  const collected = []
  for await (const n of bus.events('score').take(3)) {
    collected.push(n)
    console.log('score:', n)
  }
  console.log('done — collected:', collected.length, 'values')
}

void collectFirstThree()

let i = 0
const timer = setInterval(() => {
  bus.emit('score', ++i * 10)
  if (i >= 6) {
    clearInterval(timer)
    bus.dispose()
  }
}, 40)`,
  name: 'events().take()',
};
