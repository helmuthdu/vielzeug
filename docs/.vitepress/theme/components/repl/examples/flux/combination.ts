export const combinationExample = {
  code: `// Combine current filter and page state from replaying channels.
import { combineLatest } from '@vielzeug/flux'
import { createChannel } from '@vielzeug/flux/subjects'

const count = createChannel({ initial: 0 })
const label = createChannel({ initial: 'items' })

combineLatest(count.stream, label.stream).subscribe({
  error: console.error,
  next: ([value, text]) => console.log(value, text),
})

count.send(1) // 1 items
label.send('tasks') // 1 tasks
count.dispose()
label.dispose()`,
  name: 'Combining Streams',
};
