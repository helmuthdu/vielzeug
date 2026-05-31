---
title: Ripple — Store History (Undo/Redo)
description: Time-travel state management with storeWithHistory.
---

# Store History — Undo/Redo

`storeWithHistory` wraps a store with snapshot-based history. Every mutation pushes a snapshot; `undo()` and `redo()` navigate the buffer without re-running any logic.

## Text Editor

```ts
import { storeWithHistory, effect } from '@vielzeug/ripple';

const editor = storeWithHistory(
  { text: '', cursor: 0 },
  { maxHistory: 100, name: 'editor' },
);

effect(() => {
  console.log('text:', editor.value.text);
});

editor.patch({ text: 'H' });
editor.patch({ text: 'He' });
editor.patch({ text: 'Hello' });

console.log(editor.historyLength);  // 4 (initial + 3 patches)
console.log(editor.historyAt(0));   // { text: '', cursor: 0 }
console.log(editor.historyAt(1));   // { text: 'H', cursor: 0 }

editor.undo();
console.log(editor.value.text);     // 'He'

editor.undo();
console.log(editor.value.text);     // 'H'

editor.redo();
console.log(editor.value.text);     // 'He'
```

## Branching History

Writing after an undo discards the redo stack (no branch-divergence support):

```ts
const s = storeWithHistory({ n: 0 });
s.patch({ n: 1 });
s.patch({ n: 2 });
s.undo();          // n = 1

s.patch({ n: 99 }); // branches from 1 — redo to 2 no longer possible
console.log(s.historyLength); // 3: [0, 1, 99]
```

## Full Store API Still Works

`StoreWithHistory<T>` extends `Store<T>`, so all store methods are available:

```ts
const doc = storeWithHistory({ title: 'Draft', content: '' });

// lenses, map, filter, watch all work
const titleLens = doc.lens('title');
titleLens.value = 'Published';   // snapshot pushed

const titleSignal = doc.map((d) => d.title);

import { watch } from '@vielzeug/ripple';
const stop = watch(doc, (curr) => console.log('doc changed:', curr.title));

doc.reset();  // restores initial state, pushes snapshot
stop.dispose();
titleSignal.dispose();
```
