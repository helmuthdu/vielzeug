# @vielzeug/keymap

Headless keyboard shortcut manager with target-local chord state, event-aware guards, conflict detection, and terminal disposal.

## Features

- `createKeymap()` manages bindings on one or more `EventTarget`s.
- Chords support sequences such as `"g g"` and `"ctrl+k ctrl+s"`.
- `when(event)` guards inspect event target and composed path.
- `findShortcutConflicts()` detects duplicate and unreachable prefix paths.
- `formatShortcut()` produces Mac symbols or platform labels.
- `dispose()` releases all listeners and permanently ends manager lifecycle.

## Install

```sh
pnpm add @vielzeug/keymap
```

## Quick Start

Create one map for an application scope, then mount and dispose it with that scope.

```ts
import { createKeymap, formatShortcut } from '@vielzeug/keymap';

const isEditableTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLElement && target.isContentEditable;

const map = createKeymap({
  'mod+k mod+s': () => console.log('save'),
  'mod+shift+p': () => console.log('open palette'),
  'g g': () => window.scrollTo({ top: 0 }),
  escape: { handler: () => console.log('close panel'), when: (event) => !isEditableTarget(event.target) },
  space: { handler: () => console.log('toggle playback'), trigger: 'keyup' },
});

const unmount = map.mount(document);
console.log(formatShortcut('mod+shift+p', 'meta')); // ⇧⌘P

unmount();
map.dispose();
```

Use separate maps with mutually exclusive `when(event)` guards for independent UI owners that share shortcuts. `dispose()` is terminal; temporary detachment uses mount callbacks.

[Full documentation](https://vielzeug.dev/keymap/)
