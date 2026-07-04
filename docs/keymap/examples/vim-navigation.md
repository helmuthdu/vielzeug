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

Pass chord sequences as space-separated shortcut strings and mount to the target element. Keymap
tracks partial chords per mounted keymap and resets them after `chordTimeout` milliseconds.

```ts
import { createKeymap } from '@vielzeug/keymap';

const map = createKeymap(
  {
    'g g': () => scrollToTop(),
    'shift+g': () => scrollToBottom(), // Vim's `G` — a single keystroke, not a `g`-prefixed chord
    'g h': () => navigateHome(),
    'g e': () => navigateEnd(),
    'z z': () => centerCurrentLine(),
    'ctrl+w ctrl+h': () => focusLeftPane(),
    'ctrl+w ctrl+l': () => focusRightPane(),
    'ctrl+w ctrl+j': () => focusBottomPane(),
    'ctrl+w ctrl+k': () => focusTopPane(),
  },
  {
    chordTimeout: 800,
    preventDefault: true,
  },
);

map.mount(document.getElementById('editor')!);
```

After pressing `g`, Keymap enters a pending state and waits up to 800 ms for the second key. If no
second key is pressed within the timeout, the buffer resets silently. If an unrecognised second key
is pressed, the buffer resets and that key is re-evaluated from the start — so `g x` falls through
without eating `x`.

### Pitfalls

- Shortcut strings are lowercased before matching, so a chord like `'g g'` and a *different* string that happens to canonicalize to the same steps (e.g. differing only by letter case) collide — the second one silently overwrites the first at construction time. Use a distinct key (like `shift+g` above, matching Vim's actual `G` binding) instead of relying on case to distinguish two chords.
- A single-key binding sharing the first step of a longer chord (e.g. binding `'g'` alongside `'g g'`) always wins immediately — the longer chord becomes unreachable. Use [`findShortcutConflicts()`](/keymap/api.md#findshortcutconflicts-shortcut-entries-options) to catch this before it ships.
- A short `chordTimeout` (under ~300 ms) can make two-step chords feel unreliable for anyone typing at a normal pace; 800 ms–1000 ms is a safer default for navigation chords.

### Related

- [Global Shortcuts](./global-shortcuts.md)
- [Keymap Usage Guide — Chord Sequences](/keymap/usage.md#chord-sequences)
- [Keymap API Reference](/keymap/api.md)
