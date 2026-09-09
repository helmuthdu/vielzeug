# @vielzeug/ore

> Functional web-component authoring on top of ripple

## Installation

```sh
pnpm add @vielzeug/ore @vielzeug/ripple
npm install @vielzeug/ore @vielzeug/ripple
yarn add @vielzeug/ore @vielzeug/ripple
```

## Quick Start

```ts
import { computed, signal } from '@vielzeug/ripple';
import { bind, css, define, html, onMounted, prop } from '@vielzeug/ore';

define('my-counter', {
  props: {
    label: prop.string('Count'),
    step: prop.number(1),
  },
  styles: [
    css`
      :host {
        display: inline-grid;
        gap: 0.5rem;
      }
    `,
  ],
  setup(props) {
    const count = signal(0);
    const doubled = computed(() => count.value * 2);

    bind({ class: { 'is-positive': () => count.value > 0 } });

    onMounted(() => console.log('mounted'));

    return html`
      <button @click=${() => (count.value += props.step.value)}>${props.label}: ${count}</button>
      <p>Doubled: ${doubled}</p>
    `;
  },
});
```

## Documentation

- [Overview](https://vielzeug.dev/ore/)
- [Usage Guide](https://vielzeug.dev/ore/usage)
- [API Reference](https://vielzeug.dev/ore/api)
- [Examples](https://vielzeug.dev/ore/examples)
- [Migration Guide](https://vielzeug.dev/ore/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
