# @vielzeug/focus

Framework-neutral focus navigation and restoration primitives.

## Install

```sh
pnpm add @vielzeug/focus
```

## Quick Start

```ts
import { captureFocus, createListNavigation } from '@vielzeug/focus';

const restore = captureFocus();

const listNavigation = createListNavigation({
  getItems: () => items,
  loop: true,
  onNavigate: (_action, index) => items[index]?.focus(),
});

listElement.addEventListener('keydown', listNavigation.handleKeydown);

restore.restore();
listNavigation.dispose();
```

[Full documentation](https://vielzeug.dev/focus/)
