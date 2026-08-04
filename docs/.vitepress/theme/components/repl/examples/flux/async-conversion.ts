export const asyncConversionExample = {
  code: `// Consume a push stream with an explicit bounded async queue.
import { of, toAsyncIterable } from '@vielzeug/flux'

async function run() {
  const values = toAsyncIterable(of(1, 2, 3), {
    capacity: 3,
    overflow: 'error',
  })

  for await (const value of values) {
    console.log('value:', value)
  }

  console.log('iterator complete')
}

void run()`,
  name: 'Async Conversion',
};
