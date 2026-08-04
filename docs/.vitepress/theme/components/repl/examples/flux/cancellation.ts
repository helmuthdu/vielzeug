export const cancellationExample = {
  code: `// Stop synchronous iterable work as soon as take() reaches its limit.
import { from, pipe, take } from '@vielzeug/flux'

function* ids() {
  for (let value = 1; value <= 5; value++) {
    console.log('produced:', value)
    yield value
  }
}

pipe(from(ids()), take(2)).subscribe({
  complete: () => console.log('complete'),
  error: console.error,
  next: (value) => console.log('consumed:', value),
})`,
  name: 'Cancelling an Iterable',
};
