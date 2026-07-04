export const parseAndMatchExample = {
  code: `import { KeymapError, KeymapParseError, formatShortcut, matchStep, parseShortcut } from '@vielzeug/keymap'

// Parse shortcut strings into structured step objects.
const steps = parseShortcut('ctrl+k ctrl+s', 'ctrl')
console.log('Steps:', steps.length)
console.log('Step 0 key:', steps[0].key)
console.log('Step 0 modifiers:', [...steps[0].modifiers])

// matchStep tests a single KeyboardEvent against a parsed step.
const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
console.log('event matches ctrl+k:', matchStep(event, steps[0]))  // true
console.log('event matches ctrl+s:', matchStep(event, steps[1]))  // false

// formatShortcut turns a shortcut string into a display label.
const shortcuts = [
  ['mod+shift+p', 'meta'],
  ['mod+shift+p', 'ctrl'],
  ['ctrl+k ctrl+s', 'ctrl'],
  ['escape', 'ctrl'],
  ['space', 'meta'],
]

for (const [shortcut, modKey] of shortcuts) {
  console.log(shortcut, '→', formatShortcut(shortcut, modKey))
}

// parseShortcut() throws KeymapParseError for ambiguous or invalid steps.
// Catch it with instanceof KeymapError (or KeymapError.is()) to handle any keymap error.
try {
  parseShortcut('ctrl+k+j', 'ctrl') // two non-modifier keys in one step — ambiguous
} catch (err) {
  console.log('Caught:', KeymapError.is(err), err instanceof KeymapParseError, err.message)
}`,
  name: 'Parse & Match',
};
