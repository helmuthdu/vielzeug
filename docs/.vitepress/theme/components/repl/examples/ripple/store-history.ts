export const storeHistoryExample = {
  code: `import { storeWithHistory, watch } from '@vielzeug/ripple'

// storeWithHistory wraps a store with snapshot-based undo/redo.
// Every patch(), replace(), reset(), and lens() write pushes a snapshot.
const editor = storeWithHistory({ text: '', cursor: 0 }, { maxHistory: 20 })

const textLens = editor.lens('text')

watch(textLens, (next) => console.log('text:', JSON.stringify(next)))

editor.patch({ text: 'Hello', cursor: 5 })
editor.patch({ text: 'Hello World', cursor: 11 })
textLens.value = 'Hello World!'

console.log('historyLength:', editor.historyLength) // 4

editor.undo()
console.log('after undo:', editor.value.text) // 'Hello World'

editor.undo()
console.log('after undo:', editor.value.text) // 'Hello'

editor.redo()
console.log('after redo:', editor.value.text) // 'Hello World'

// Writing after undo discards the redo stack
editor.patch({ text: 'Goodbye', cursor: 7 })
console.log('historyLength after new write:', editor.historyLength) // 4`,
  name: 'Store History — Undo/Redo',
};
