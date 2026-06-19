export const basicFluxExample = {
  code: `import { flux, of, from, map, take } from '@vielzeug/flux'

// Cold stream — producer runs once per subscriber
const integers = flux((observer) => {
  let i = 0
  const id = setInterval(() => {
    observer.next(i++)
    if (i >= 5) {
      observer.complete()
      clearInterval(id)
    }
  }, 50)
  return () => clearInterval(id)
})

integers.pipe(
  map((n) => n * 2),
  take(3),
).subscribe({
  next(v)     { console.log('value:', v) },   // 0, 2, 4
  complete()  { console.log('done') },
})

// Synchronous sources with of() and from()
of(10, 20, 30).subscribe((v) => console.log('of:', v))

from([100, 200, 300]).subscribe((v) => console.log('from:', v))`,
  name: 'Creating a Cold Stream',
};
