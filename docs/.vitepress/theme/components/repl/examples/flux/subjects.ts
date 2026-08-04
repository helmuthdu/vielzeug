export const subjectsExample = {
  code: `// Replay latest events to late subscribers while keeping send() at one boundary.
import { createChannel } from '@vielzeug/flux/subjects'

const events = createChannel({ replay: 2 })

events.stream.subscribe({
  error: console.error,
  next: (value) => console.log('first:', value),
})
events.send('connected')
events.send('ready')
events.send('updated')

events.stream.subscribe({
  error: console.error,
  next: (value) => console.log('late:', value),
})
// late: ready
// late: updated

events.dispose()`,
  name: 'Channels',
};
