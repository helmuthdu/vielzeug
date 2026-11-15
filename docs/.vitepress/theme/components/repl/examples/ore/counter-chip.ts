export const counterChipExample = {
  code: `import { define, html } from '@vielzeug/ore'
import { signal } from '@vielzeug/ripple'

// define() registers a custom element: setup() returns a template whose
// bindings track signals. No classes, no lifecycle boilerplate.
define('counter-chip', {
  setup() {
    const count = signal(0)

    return html\`
      <button style="padding: 8px 16px; border-radius: 8px; border: 1px solid currentColor; background: transparent; color: inherit; cursor: pointer; font: inherit"
        @click=\${() => count.value++}>
        clicked \${() => count.value} ×
      </button>
    \`
  },
})

const chip = document.createElement('counter-chip')
document.body.appendChild(chip)

console.log('mounted a <counter-chip> — click it, watch this log:')
chip.addEventListener('click', () => console.log('chip clicked'))`,
  name: 'Counter chip',
};
