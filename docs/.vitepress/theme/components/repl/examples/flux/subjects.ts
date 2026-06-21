export const subjectsExample = {
  code: `import { createSubject, createBehaviorSubject, createReplaySubject } from '@vielzeug/flux'

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
count.subscribe((v) => console.log('count late:', v))  // count late: 2
count.emit(3)  // count late: 3

// ReplaySubject — replays last N values to every new subscriber
const log = createReplaySubject(3)

log.emit('msg1')
log.emit('msg2')
log.emit('msg3')
log.emit('msg4')  // buffer is [msg2, msg3, msg4]

// Late subscriber receives the last 3 buffered values
log.subscribe((v) => console.log('log late:', v))
// log late: msg2  msg3  msg4

count.dispose()
events.dispose()
log.dispose()`,
  name: 'Subjects',
};
