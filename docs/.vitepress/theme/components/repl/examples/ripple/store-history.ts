export const storeHistoryExample = {
  code: `import { storeWithHistory, effect } from '@vielzeug/ripple'

// storeWithHistory wraps a store with snapshot-based undo/redo.
// Mutations do NOT auto-push snapshots — call .push() explicitly.
const editor = storeWithHistory({ text: '', cursor: 0 }, { maxHistory: 20 })

// canUndo / canRedo live on the adapter — reactive (re-run effect when they change)
const stopButtons = effect(() => {
  console.log('canUndo:', editor.canUndo, '| canRedo:', editor.canRedo)
})

editor.store.patch({ text: 'Hello', cursor: 5 })
editor.push() // checkpoint 1

editor.store.patch({ text: 'Hello World', cursor: 11 })
editor.push() // checkpoint 2

console.log('historyLength:', editor.historyLength) // 3 (initial + 2 pushes)

editor.undo()
console.log('after undo:', editor.store.peek().text) // 'Hello'

editor.undo()
console.log('after undo:', editor.store.peek().text) // ''

editor.redo()
console.log('after redo:', editor.store.peek().text) // 'Hello'

// Writing after undo discards the redo stack
editor.store.patch({ text: 'Goodbye', cursor: 7 })
editor.push()
console.log('historyLength after new write:', editor.historyLength) // 3

stopButtons.dispose()

// dispose() releases the cursor signal; also disposes the store
// because the adapter created it (ownership). Pass an existing store
// to storeWithHistory(s) if you want the adapter to leave it alive.
editor.dispose()`,
  name: 'Store History — Undo/Redo',
};
