export const errorHandlingExample = {
  code: `// Retry a transient producer error with a bounded attempt count.
import { toArray, pipe, retry, stream } from '@vielzeug/flux'

let attempt = 0
const source = stream((sink) => {
  attempt++
  console.log('attempt:', attempt)

  if (attempt < 3) {
    sink.error(new Error('temporary failure'))
    return
  }

  sink.next('success')
  sink.complete()
})

toArray(pipe(source, retry({ attempts: 2 })), { maxItems: 1 })
  .then((values) => console.log('result:', values))
  .catch(console.error)`,
  name: 'Error Handling',
};
