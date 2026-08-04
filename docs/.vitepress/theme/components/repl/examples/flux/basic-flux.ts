export const basicFluxExample = {
  code: `// Build a cold stream and convert a bounded derived sequence to an array.
import { toArray, map, pipe, stream, take } from '@vielzeug/flux'

const integers = stream((sink) => {
  let value = 0
  const id = setInterval(() => sink.next(value++), 50)

  return () => clearInterval(id)
})

const values = pipe(
  integers,
  map((value) => value * 2),
  take(3),
)

toArray(values, { maxItems: 3 })
  .then((result) => console.log('values:', result))
  .catch(console.error)`,
  name: 'Creating a Stream',
};
