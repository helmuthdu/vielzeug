export const subjectsExample = {
  code: `import { createSubject, createBehaviorSubject } from '@vielzeug/flux'

// Subject — hot multicast, no replay
const events = createSubject()

const unsub1 = events.subscribe((v) => console.log('A:', v))
const unsub2 = events.subscribe((v) => console.log('B:', v))

events.emit('hello')   // A: hello  B: hello
events.emit('world')   // A: world  B: world
unsub1()               // remove first subscriber
events.emit('only B')  // B: only B

// BehaviorSubject — replays latest value to new subscribers
const count = createBehaviorSubject(0)

count.emit(1)
count.emit(2)

// Late subscriber immediately receives 2
count.subscribe((v) => console.log('late:', v))  // late: 2

count.emit(3)  // late: 3

count.dispose()
events.dispose()`,
  name: 'Subjects',
};
