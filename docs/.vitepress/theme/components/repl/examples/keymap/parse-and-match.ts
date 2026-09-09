export const parseAndMatchExample = {
  code: `import { KeymapError, KeymapParseError, formatShortcut, findShortcutConflicts, createKeymap } from '@vielzeug/keymap'

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

// createKeymap() throws KeymapParseError for ambiguous or invalid steps.
// Catch it with instanceof KeymapError to handle any keymap error.
try {
  createKeymap([{ id: 'bad', shortcut: 'ctrl+k+j', handler: () => {} }], { modKey: 'ctrl' })
} catch (err) {
  console.log('Caught:', err instanceof KeymapError, err instanceof KeymapParseError, err.message)
}

// findShortcutConflicts() detects prefix/duplicate conflicts before binding.
const map = createKeymap([
  { id: 'top', shortcut: 'g', handler: () => console.log('go to top') },
])

console.log('Would "g g" conflict?', findShortcutConflicts('g g', map.listBindings()).length > 0)
console.log('Would "x" conflict?', findShortcutConflicts('x', map.listBindings()).length > 0)`,
  name: 'Format & Conflicts',
};
