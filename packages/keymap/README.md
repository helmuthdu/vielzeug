# @vielzeug/keymap

> Headless keyboard shortcut manager with chord sequences

## Installation

```sh
pnpm add @vielzeug/keymap
npm install @vielzeug/keymap
yarn add @vielzeug/keymap
```

## Quick Start

```ts
import { createKeymap, formatShortcut } from '@vielzeug/keymap';

const isEditableTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLElement && target.isContentEditable;

const map = createKeymap([
  { id: 'save', shortcut: 'mod+k mod+s', handler: () => console.log('save') },
  { id: 'palette', shortcut: 'mod+shift+p', handler: () => console.log('open palette') },
  { id: 'top', shortcut: 'g g', handler: () => window.scrollTo({ top: 0 }) },
  { id: 'close', shortcut: 'escape', handler: () => console.log('close panel'), when: (event) => !isEditableTarget(event.target) },
  { id: 'play', shortcut: 'space', handler: () => console.log('toggle playback'), trigger: 'keyup' },
]);

const unmount = map.mount(document);
console.log(formatShortcut('mod+shift+p', 'meta')); // ⇧⌘P

unmount();
map.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/keymap/)
- [Usage Guide](https://vielzeug.dev/keymap/usage)
- [API Reference](https://vielzeug.dev/keymap/api)
- [Examples](https://vielzeug.dev/keymap/examples)
- [Migration Guide](https://vielzeug.dev/keymap/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
