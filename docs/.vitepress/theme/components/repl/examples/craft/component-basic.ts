export const componentBasicExample = {
  code: "import { define, html, signal, computed, prop } from '@vielzeug/craft'\n\n// Define a reactive counter component with a typed prop\ndefine('demo-counter', {\n  props: {\n    label: prop.string('Count'),\n  },\n  shadow: false,\n  setup(props) {\n    const count = signal(0)\n    const doubled = computed(() => count.value * 2)\n\n    return html`\n      <button @click=${() => count.value++}>\n        ${props.label}: ${count}\n      </button>\n      <p>Doubled: ${doubled}</p>\n    `\n  },\n})\n\nconst el = document.createElement('demo-counter')\ndocument.body.appendChild(el)\nconsole.log('Component mounted:', el.localName)",
  name: 'Define a Component',
};
