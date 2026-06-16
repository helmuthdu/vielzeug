export const storeHistoryExample = {
  code: `import { storeWithHistory, effect } from '@vielzeug/ripple'

// storeWithHistory wraps a store with snapshot-based undo/redo.
// Access the underlying store via .store for mutations and reads.
const editor = storeWithHistory({ text: '', cursor: 0 }, { maxHistory: 20 })

// canUndo / canRedo live on the adapter — reactive (re-run effect when they change)
const stopButtons = effect(() => {
  console.log('canUndo:', editor.canUndo, '| canRedo:', editor.canRedo)
})

editor.store.patch({ text: 'Hello', cursor: 5 })
editor.store.patch({ text: 'Hello World', cursor: 11 })

console.log('historyLength:', editor.historyLength) // 3

editor.undo()
console.log('after undo:', editor.store.peek().text) // 'Hello'

editor.undo()
console.log('after undo:', editor.store.peek().text) // ''

editor.redo()
console.log('after redo:', editor.store.peek().text) // 'Hello'

// Writing after undo discards the redo stack
editor.store.patch({ text: 'Goodbye', cursor: 7 })
console.log('historyLength after new write:', editor.historyLength) // 3

stopButtons.dispose()

// dispose() releases the cursor signal and the underlying store
editor.dispose()`,
  name: 'Store History — Undo/Redo',
};
