export const persistProgressExample = {
  code: `import { createTour } from '@vielzeug/beacon'

// Any key-value object is a BeaconStorage; keys arrive namespaced.
const db = new Map()
const storage = {
  get: (key) => (db.has(key) ? JSON.parse(db.get(key)) : null),
  remove: (key) => db.delete(key),
  set: (key, value) => db.set(key, JSON.stringify(value)),
}

const steps = [
  { id: 'a', title: 'First' },
  { id: 'b', title: 'Second' },
  { id: 'c', title: 'Third' },
]

const first = createTour({ id: 'resume-demo', steps, storage, targetTimeoutMs: 0 })
first.start()
first.next()
console.log('First session stopped at step index:', first.current.value.stepIndex)
first.pause() // keeps progress so the next handle resumes

// A brand-new handle (next page load) resumes from the stored record.
const second = createTour({ id: 'resume-demo', steps, storage, targetTimeoutMs: 0 })
console.log('Resumed status:', second.status.value)
second.start()
console.log('Resumed at step:', second.current.value.step.title)

second.finish()
console.log('After finish:', second.status.value)

// start() is a no-op for completed tours:
second.start()
console.log('Still:', second.status.value)

// reset() makes it eligible again (what a "Replay tour" button calls):
second.reset()
second.start()
console.log('After reset + start, step:', second.current.value.step.title)`,
  name: 'Persist Progress - Resume, Finish, Replay',
};
