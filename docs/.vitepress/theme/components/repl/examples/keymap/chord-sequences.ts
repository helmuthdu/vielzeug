export const chordSequencesExample = {
  code: `import { createKeymap, findShortcutConflicts } from '@vielzeug/keymap'

// Chord sequences fire only after all steps are pressed in order within the timeout.
// Shortcut strings are lowercased before matching, so 'g g' and 'g G' are the SAME
// binding — writing both would silently overwrite one. Vim's actual 'G' is shift+g,
// a single keystroke, not a 'g'-prefixed chord.
const map = createKeymap({
  'ctrl+k ctrl+s': () => console.log('save all (VS Code-style)'),
  'g g':           () => console.log('go to top (Vim-style)'),
  'shift+g':       () => console.log('go to bottom'),
}, { chordTimeout: 800, modKey: 'ctrl' })

const unmount = map.mount(document)

// Simulate completing 'ctrl+k ctrl+s' chord.
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }))

// Simulate Vim 'g g' chord.
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }))
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }))

// Gotcha: a single-key binding sharing a chord's first step always wins immediately,
// making the longer chord unreachable — findShortcutConflicts() catches this up front.
console.log('Would ctrl+k (alone) conflict with the chord above?')
console.log(findShortcutConflicts('ctrl+k', map.listBindings()))

unmount()`,
  name: 'Chord Sequences',
};
