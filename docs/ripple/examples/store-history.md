---
title: 'Ripple Examples — Store History (Undo/Redo)'
description: 'Time-travel state management with storeWithHistory for @vielzeug/ripple.'
---

## Store History — Undo/Redo

### Problem

You need undo/redo support for structured state without implementing your own snapshot buffer. Use `storeWithHistory()` to wrap any `store()` with automatic snapshot tracking across `patch()`, `replace()`, `reset()`, and `lens()` writes.

### Solution

Use `storeWithHistory()` in place of `store()` and call `undo()` / `redo()` to navigate the snapshot buffer.

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

#### With lens writes

Lens writes also push snapshots and are individually undoable:

```ts
import { storeWithHistory, watch } from '@vielzeug/ripple';

const doc = storeWithHistory({ title: 'Draft', content: '' });
const titleLens = doc.lens('title');

titleLens.value = 'Published'; // snapshot pushed

console.log(doc.historyLength); // 2
doc.undo();
console.log(doc.value.title);   // 'Draft'
```

#### With branching history

Writing after an undo discards the redo stack — no branch-divergence support:

```ts
const s = storeWithHistory({ n: 0 });
s.patch({ n: 1 });
s.patch({ n: 2 });
s.undo();           // n = 1

s.patch({ n: 99 }); // redo to 2 is no longer possible
console.log(s.historyLength); // 3: [0, 1, 99]
```

### Pitfalls

- Snapshots are **shallow copies** — nested objects are cloned one level deep via `structuredClone`. Deep mutations inside nested objects are not individually tracked.
- `maxHistory` is a ring buffer; oldest snapshots are evicted silently when the cap is reached.
- Lens writes each push a separate snapshot — batch multiple lens writes inside `batch()` if you want a single undo step.

### Related

- [Stores](./stores.md)
- [Batch for Complex Mutations](./pattern-batch-for-complex-mutations.md)
