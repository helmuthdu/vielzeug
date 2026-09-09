# @vielzeug/sandbox

> Sandboxed iframe runtime with typed postMessage state bridge

## Installation

```sh
pnpm add @vielzeug/sandbox
npm install @vielzeug/sandbox
yarn add @vielzeug/sandbox
```

## Quick Start

```ts
import { createSandbox } from '@vielzeug/sandbox';

interface AppState {
  locale: string;
  theme: 'dark' | 'light';
}

const container = document.getElementById('preview')!;
const sandbox = createSandbox<AppState>(container, {
  styles: { theme: 'body { color-scheme: light; }' },
  title: 'Preview',
});

sandbox.onMessage((message) => {
  if (message.type === 'custom' && message.event === 'button:click') {
    // Custom details are untrusted. Narrow before use.
    if (typeof message.detail === 'object' && message.detail !== null && 'label' in message.detail) {
      console.log(message.detail.label);
    }
  }
  if (message.type === 'error') console.error(message.message);
  if (message.type === 'resize') console.log(message.height);
});

await sandbox.render('<button>Save</button>');
sandbox.setState({ locale: 'en', theme: 'dark' });
sandbox.updateStyle('theme', 'body { color-scheme: dark; }');

sandbox.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/sandbox/)
- [Usage Guide](https://vielzeug.dev/sandbox/usage)
- [API Reference](https://vielzeug.dev/sandbox/api)
- [Examples](https://vielzeug.dev/sandbox/examples)
- [Migration Guide](https://vielzeug.dev/sandbox/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
