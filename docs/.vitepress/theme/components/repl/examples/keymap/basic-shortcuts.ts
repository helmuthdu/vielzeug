export const basicShortcutsExample = {
  code: `import { createKeymap, formatShortcut } from '@vielzeug/keymap'

// Create a keymap — bindings fire on keydown by default.
const map = createKeymap({
  'ctrl+s': () => console.log('save triggered'),
  escape:   { handler: () => console.log('close panel'), when: () => true },
  space:    { handler: () => console.log('toggle play'), trigger: 'keyup' },
}, { modKey: 'ctrl' })

// Mount to document (required for event listening).
const unmount = map.mount(document)

// Simulate events for demonstration.
document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }))
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
document.dispatchEvent(new KeyboardEvent('keyup',   { key: ' ', bubbles: true }))

// Format shortcuts for display in UI tooltips or menus.
console.log(formatShortcut('ctrl+s', 'ctrl'))         // 'Ctrl+S'
console.log(formatShortcut('mod+shift+p', 'meta'))    // '⇧⌘P'
console.log(formatShortcut('ctrl+k ctrl+s', 'ctrl'))  // 'Ctrl+K Ctrl+S'

unmount()`,
  name: 'Basic Shortcuts',
};
