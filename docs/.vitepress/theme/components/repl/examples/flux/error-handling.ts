export const errorHandlingExample = {
  code: `import { flux, throwError, catchError, retry, of, finalize } from '@vielzeug/flux'

// catchError — recover from an error with a fallback stream
throwError(new Error('oops'))
  .pipe(catchError((err) => {
    console.log('caught:', err.message)
    return of('recovered')
  }))
  .subscribe({
    next(v)    { console.log('value:', v) },     // value: recovered
    complete() { console.log('complete') },      // complete
  })

// retry — re-subscribe up to N times before propagating
let attempt = 0

flux((observer) => {
  attempt++
  console.log('attempt', attempt)
  if (attempt < 3) {
    observer.error(new Error('fail'))
  } else {
    observer.next('success')
    observer.complete()
  }
})
  .pipe(retry(3))
  .subscribe({
    next(v)    { console.log('result:', v) },   // result: success
    error(err) { console.log('error:', err) },
  })

// finalize — always called on complete, error, or unsubscribe
of(1, 2, 3)
  .pipe(finalize(() => console.log('finalize called')))
  .subscribe({
    next(v)    { console.log('v:', v) },
    complete() { console.log('complete') },
  })`,
  name: 'Error Handling',
};
