---
title: 'Keymap Examples — Vim-style Navigation'
description: 'Implement chord sequences for keyboard-driven navigation with @vielzeug/keymap.'
---

## Vim-style Navigation

### Problem

You want Vim-style motion commands — two-key chords like `gg` to jump to the top, plus
pane-focus chords like `Ctrl+W Ctrl+H` — scoped to a specific editor element rather than the
whole document.

### Solution

Pass chord sequences as space-separated shortcut strings and mount to target element. Keymap tracks partial chords per mounted target and resets them after `chordTimeout` milliseconds.

```ts
import { createKeymap } from '@vielzeug/keymap';

const map = createKeymap(
  [
    { id: 'top', shortcut: 'g g', handler: () => scrollToTop() },
    { id: 'bottom', shortcut: 'shift+g', handler: () => scrollToBottom() }, // Vim's `G` — a single keystroke, not a `g`-prefixed chord
    { id: 'home', shortcut: 'g h', handler: () => navigateHome() },
    { id: 'end', shortcut: 'g e', handler: () => navigateEnd() },
    { id: 'center', shortcut: 'z z', handler: () => centerCurrentLine() },
    { id: 'left', shortcut: 'ctrl+w ctrl+h', handler: () => focusLeftPane() },
    { id: 'right', shortcut: 'ctrl+w ctrl+l', handler: () => focusRightPane() },
    { id: 'down', shortcut: 'ctrl+w ctrl+j', handler: () => focusBottomPane() },
    { id: 'up', shortcut: 'ctrl+w ctrl+k', handler: () => focusTopPane() },
  ],
  { chordTimeout: 800 },
);

map.mount(document.getElementById('editor')!);
```

After pressing `g`, Keymap enters a pending state and waits up to 800 ms for the second key. If no
second key is pressed within the timeout, the buffer resets silently. If an unrecognised second key
is pressed, the buffer resets and that key is re-evaluated from the start — so `g x` falls through
without eating `x`.

### Pitfalls

- Shortcut strings are lowercased before matching. Canonically equivalent shortcuts with different IDs coexist, but only the first binding whose guard passes fires. Use a distinct key such as `shift+g` when case represents different behavior.
- A single-key binding sharing the first step of a longer chord (e.g. binding `'g'` alongside `'g g'`) always wins immediately — the longer chord becomes unreachable. Use [`findShortcutConflicts()`](/keymap/api.md#findshortcutconflicts) to catch this before it ships.
- A short `chordTimeout` (under ~300 ms) can make two-step chords feel unreliable for anyone typing at a normal pace; 800 ms–1000 ms is a safer default for navigation chords.

### Related

- [Global Shortcuts](./global-shortcuts.md)
- [Keymap Usage Guide — Chord Sequences](/keymap/usage.md#chord-sequences)
- [Keymap API Reference](/keymap/api.md)
