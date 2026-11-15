export const todoListExample = {
  code: `import { define, each, html, when } from '@vielzeug/ore'
import { signal } from '@vielzeug/ripple'

// each() renders lists, when() toggles blocks: both reactive against signals.
const todos = signal([
  { done: true, id: 1, text: 'Read the ore overview' },
  { done: false, id: 2, text: 'Build a component with define()' },
  { done: false, id: 3, text: 'Ship it' },
])

define('todo-list', {
  setup() {
    const toggle = (id: number) => {
      todos.value = todos.value.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    }

    return html\`
      <ol style="padding-left: 1.25rem; margin: 0 0 0.5rem">
        \${each(
          todos,
          (todo) => todo.id,
          (todo) => html\`
            <li style=\${() => (todo.value.done ? 'opacity: 0.5; text-decoration: line-through; cursor: pointer' : 'cursor: pointer')}
                @click=\${() => toggle(todo.value.id)}>
              \${() => todo.value.text}
            </li>\`,
          () => html\`<li>Nothing to do</li>\`,
        )}
      </ol>
      <p>\${when(
        () => todos.value.every((t) => t.done),
        () => html\`<strong>All done 🎉</strong>\`,
        () => html\`<span>\${() => todos.value.filter((t) => !t.done).length} remaining — click an item to toggle</span>\`,
      )}</p>
    \`
  },
})

document.body.appendChild(document.createElement('todo-list'))`,
  name: 'Todo list',
};
