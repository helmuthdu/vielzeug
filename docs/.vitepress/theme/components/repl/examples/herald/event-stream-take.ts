export const eventStreamTakeExample = {
  code: `import { createBus } from '@vielzeug/herald'

// Collect the first 3 emits then break — await using ensures cleanup
const bus = createBus()

async function collectFirstThree() {
  const collected = []

  await using stream = bus.events('score')
  for await (const n of stream) {
    collected.push(n)
    console.log('score:', n)
    if (collected.length >= 3) break
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
  name: 'events() with break',
};
