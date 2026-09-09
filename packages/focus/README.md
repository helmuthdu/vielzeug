# @vielzeug/focus

> Framework-neutral list navigation and focus restoration primitives

## Installation

```sh
pnpm add @vielzeug/focus
npm install @vielzeug/focus
yarn add @vielzeug/focus
```

## Quick Start

```ts
import { captureFocus, createListNavigation } from '@vielzeug/focus';

const restore = captureFocus();
const navigation = createListNavigation({
  getItems: () => items,
  loop: true,
});
const onKeydown = (event: KeyboardEvent) => {
  navigation.handleKeydown(event)?.change?.item.focus();
};

listElement.addEventListener('keydown', onKeydown);

restore();
listElement.removeEventListener('keydown', onKeydown);
```

## Documentation

- [Overview](https://vielzeug.dev/focus/)
- [Usage Guide](https://vielzeug.dev/focus/usage)
- [API Reference](https://vielzeug.dev/focus/api)
- [Examples](https://vielzeug.dev/focus/examples)
- [Migration Guide](https://vielzeug.dev/focus/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
