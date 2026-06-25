---
title: 'Ripple Examples — Store History (Undo/Redo)'
description: 'Time-travel state management with storeWithHistory for @vielzeug/ripple.'
---

## Store History — Undo/Redo

### Problem

You need undo/redo support for structured state without implementing your own snapshot buffer. Use `storeWithHistory()` to wrap any `store()` with explicit snapshot checkpoints.

### Solution

Use `storeWithHistory()` and call `.push()` (or `.pushNamed(label)`) explicitly after each logical change to record a checkpoint. Then call `undo()` / `redo()` to navigate.

```ts
import { storeWithHistory, effect } from '@vielzeug/ripple';

const editor = storeWithHistory({ text: '', cursor: 0 }, { maxHistory: 100, name: 'editor' });

effect(() => {
  console.log('text:', editor.peek().text);
});

editor.patch({ text: 'H' });
editor.push(); // checkpoint 1

editor.patch({ text: 'He' });
editor.push(); // checkpoint 2

editor.patch({ text: 'Hello' });
editor.push(); // checkpoint 3

console.log(editor.historyLength); // 4 (initial + 3 explicit pushes)
console.log(editor.historyAt(0).state); // { text: '', cursor: 0 }
console.log(editor.historyAt(1).state); // { text: 'H', cursor: 0 }

editor.undo();
console.log(editor.peek().text); // 'He'

editor.undo();
console.log(editor.peek().text); // 'H'

editor.redo();
console.log(editor.peek().text); // 'He'
```

#### With lens writes

Lens writes do not push snapshots automatically. Call `.push()` after lens writes to record them:

```ts
import { storeWithHistory } from '@vielzeug/ripple';

const doc = storeWithHistory({ title: 'Draft', content: '' });
const titleLens = doc.lens('title');

titleLens.value = 'Published';
doc.push(); // explicit checkpoint

console.log(doc.historyLength); // 2
doc.undo();
console.log(doc.peek().title); // 'Draft'
```

#### With branching history

Writing after an undo discards the redo stack — no branch-divergence support:

```ts
const s = storeWithHistory({ n: 0 });
s.patch({ n: 1 }); s.push();
s.patch({ n: 2 }); s.push();
s.undo(); // cursor at n = 1

s.patch({ n: 99 }); s.push(); // redo to 2 is no longer possible
console.log(s.historyLength); // 3: [0, 1, 99]
```

### Pitfalls

- Mutations do **not** automatically push snapshots — you must call `.push()` explicitly after any `patch()`, `replace()`, `reset()`, or lens write.
- Snapshots are deep clones (`structuredClone`). `maxHistory` is a ring buffer; oldest snapshots are evicted silently when the cap is reached.
- To bundle multiple lens writes into one undo step, wrap them in `batch()` then call `.push()` once after.

### Related

- [Stores](./stores.md)
- [Batch for Complex Mutations](./pattern-batch-for-complex-mutations.md)
