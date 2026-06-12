export const directiveWhenExample = {
  code: "import { define, html, signal, when } from '@vielzeug/craft'\n\n// Toggle content conditionally using when()\ndefine('demo-toggle', {\n  shadow: false,\n  setup() {\n    const open = signal(false)\n\n    return html`\n      <button @click=${() => (open.value = !open.value)}>\n        ${() => (open.value ? 'Hide' : 'Show')} details\n      </button>\n      ${when(\n        open,\n        () => html`<p>Details are visible. Click to hide.</p>`,\n        () => html`<p>Click to reveal details.</p>`,\n      )}\n    `\n  },\n})\n\nconst el = document.createElement('demo-toggle')\ndocument.body.appendChild(el)\nconsole.log('Toggle component mounted')",
  name: 'Conditional Rendering with when()',
};
