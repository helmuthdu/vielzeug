export const storeHistoryExample = {
  code: `import { storeWithHistory, effect } from '@vielzeug/ripple'

// storeWithHistory wraps a store with snapshot-based undo/redo.
// Every patch(), replace(), reset(), and lens() write pushes a snapshot.
const editor = storeWithHistory({ text: '', cursor: 0 }, { maxHistory: 20 })

// canUndo / canRedo are reactive — this effect re-runs whenever the cursor moves
const stopButtons = effect(() => {
  console.log('canUndo:', editor.canUndo, '| canRedo:', editor.canRedo)
})

editor.patch({ text: 'Hello', cursor: 5 })
editor.patch({ text: 'Hello World', cursor: 11 })

console.log('historyLength:', editor.historyLength) // 3

editor.undo()
console.log('after undo:', editor.value.text) // 'Hello'

editor.undo()
console.log('after undo:', editor.value.text) // ''

editor.redo()
console.log('after redo:', editor.value.text) // 'Hello'

// Writing after undo discards the redo stack
editor.patch({ text: 'Goodbye', cursor: 7 })
console.log('historyLength after new write:', editor.historyLength) // 3

stopButtons.dispose()

// Call dispose() to release the internal cursor signal when done
editor.dispose()`,
  name: 'Store History — Undo/Redo',
};
