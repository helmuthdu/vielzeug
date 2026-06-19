export const combinationExample = {
  code: `import { createSubject, merge, combineLatest, withLatestFrom, forkJoin, of } from '@vielzeug/flux'

// merge — interleave two hot subjects
const a = createSubject()
const b = createSubject()

merge(a, b).subscribe((v) => console.log('merge:', v))

a.emit('a1')  // merge: a1
b.emit('b1')  // merge: b1
a.emit('a2')  // merge: a2

// combineLatest — emit tuple whenever any source emits (once all have values)
const x = createSubject()
const y = createSubject()

combineLatest(x, y).subscribe(([xv, yv]) => {
  console.log('combined: x=' + xv + ' y=' + yv)
})

x.emit(1)          // no output yet — y hasn't emitted
y.emit('hello')    // combined: x=1 y=hello
x.emit(2)          // combined: x=2 y=hello
y.emit('world')    // combined: x=2 y=world

// withLatestFrom — pair x with the latest y on each x emission
const p = createSubject()
const q = createSubject()

p.pipe(withLatestFrom(q)).subscribe(([pv, qv]) => {
  console.log('with latest: p=' + pv + ' q=' + qv)
})

q.emit('initial')
p.emit(10)   // with latest: p=10 q=initial
q.emit('updated')
p.emit(20)   // with latest: p=20 q=updated

// forkJoin — one tuple of last values when all complete
forkJoin(of(1, 2, 3), of('a', 'b')).subscribe(([nums, strs]) => {
  console.log('forkJoin:', nums, strs)  // forkJoin: 3 b
})

a.dispose(); b.dispose(); x.dispose(); y.dispose(); p.dispose(); q.dispose()`,
  name: 'Combining Streams',
};
