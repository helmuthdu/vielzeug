export const asyncConversionExample = {
  code: `import { of, from, toArray, toPromise } from '@vielzeug/flux'

// toArray — collect all emissions into a Promise<T[]>
toArray(of(1, 2, 3, 4, 5)).then((all) => {
  console.log('toArray:', all)   // toArray: [1,2,3,4,5]
})

// toPromise — resolve with the last emitted value
toPromise(of(10, 20, 30)).then((last) => {
  console.log('toPromise:', last)  // toPromise: 30
})

// from — convert an async iterable to a Flux
async function* gen() {
  yield 'a'
  yield 'b'
  yield 'c'
}

toArray(from(gen())).then((items) => {
  console.log('async gen:', items)  // async gen: ['a','b','c']
})

// from — convert a Promise
from(Promise.resolve('resolved')).subscribe({
  next(v)    { console.log('from promise:', v) },   // from promise: resolved
  complete() { console.log('done') },
})`,
  name: 'Async Conversion',
};
