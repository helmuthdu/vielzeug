export const localSourcePatchExample = {
  code: `// patch() applies filter, sort, search, limit, and page atomically — one recompute
import { createLocalSource } from '@vielzeug/sourcerer'

const tasks = [
  { id: 1, done: false, priority: 2, title: 'Write tests'     },
  { id: 2, done: true,  priority: 1, title: 'Fix bug #42'     },
  { id: 3, done: false, priority: 1, title: 'Review PR'       },
  { id: 4, done: true,  priority: 3, title: 'Update docs'     },
  { id: 5, done: false, priority: 3, title: 'Deploy to prod'  },
]

const source = createLocalSource(tasks, { limit: 10 })
console.log('All tasks:', source.current.map(t => t.title))

// Apply filter + sort in a single recompute (one subscriber notification)
await source.patch({
  filter: t => !t.done,
  sort:   (a, b) => a.priority - b.priority,
})
console.log('Open tasks by priority:', source.current.map(t => t.title))

// patch() accepts any combination of filter/sort/search/limit/page in one call
await source.patch({
  filter: undefined,           // clear filter
  sort:   (a, b) => b.priority - a.priority,
  search: 'doc',
})
console.log('Search "doc" sorted desc:', source.current.map(t => t.title))

// patch({ filter: undefined }) clears the filter — show all, still sorted
await source.patch({ filter: undefined, search: '' })
console.log('Cleared filter + search:', source.current.map(t => t.title))`,
  name: 'LocalSource patch() with filter/sort',
};
