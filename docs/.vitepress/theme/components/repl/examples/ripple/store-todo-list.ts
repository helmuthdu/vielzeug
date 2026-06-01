export const storeTodoListExample = {
  code: `import { store, computed } from '@vielzeug/ripple'

const todos = store({
  items: [],
  filter: 'all', // 'all' | 'active' | 'done'
})

const visible = computed(() =>
  todos.value.filter === 'active' ? todos.value.items.filter((t) => !t.done)
  : todos.value.filter === 'done' ? todos.value.items.filter((t) => t.done)
  : todos.value.items
)

todos.replace((s) => ({
  ...s,
  items: [
    { id: 1, text: 'Learn ripple', done: false },
    { id: 2, text: 'Build app', done: false },
    { id: 3, text: 'Deploy', done: true },
  ],
}))

console.log('All:', visible.value.map((t) => t.text))

todos.patch({ filter: 'active' })
console.log('Active:', visible.value.map((t) => t.text))

todos.patch({ filter: 'done' })
console.log('Done:', visible.value.map((t) => t.text))

visible.dispose()`,
  name: 'Store - Todo List',
};
