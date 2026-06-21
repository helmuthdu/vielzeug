export const chordSequencesExample = {
  code: `import { createKeymap } from '@vielzeug/keymap'

// Chord sequences fire only after all steps are pressed in order within the timeout.
const map = createKeymap({
  'ctrl+k ctrl+s': () => console.log('save all (VS Code-style)'),
  'g g':           () => console.log('go to top (Vim-style)'),
  'g G':           () => console.log('go to bottom'),
  'ctrl+k':        () => console.log('ctrl+k alone (fires immediately if no next step)'),
}, { chordTimeout: 800, modKey: 'ctrl' })

const unmount = map.mount(document)

// Simulate completing 'ctrl+k ctrl+s' chord.
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }))

// Simulate Vim 'g g' chord.
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }))
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }))

unmount()`,
  name: 'Chord Sequences',
};
