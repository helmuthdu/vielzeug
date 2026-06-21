---
title: Vim-style Navigation
description: Implement chord sequences for keyboard-driven navigation similar to Vim's motion commands.
---

# Vim-style Navigation

Chord sequences let you implement Vim-style motions — two-key combinations with a configurable timeout.

```ts
import { createKeymap } from '@vielzeug/keymap';

const map = createKeymap(
  {
    'g g': () => scrollToTop(),
    'g G': () => scrollToBottom(),
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

**How it works:** After pressing `g`, Keymap enters a pending state and waits up to 800 ms for the second key. If no second key is pressed within the timeout, the buffer resets silently. If an unrecognised second key is pressed, the buffer resets and that key is re-evaluated from the start — so `g x` falls through without eating `x`.
