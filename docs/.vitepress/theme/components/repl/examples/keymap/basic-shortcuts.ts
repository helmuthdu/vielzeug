export const basicShortcutsExample = {
  code: `import { createKeymap, formatShortcut } from '@vielzeug/keymap'

// Create a keymap — each binding has an explicit id, shortcut, and handler.
// Bindings fire on keydown by default; preventDefault defaults to true.
const map = createKeymap([
  { id: 'save',   shortcut: 'ctrl+s', handler: () => console.log('save triggered') },
  { id: 'close',  shortcut: 'escape', handler: () => console.log('close panel'), when: () => true },
  { id: 'play',   shortcut: 'space',  handler: () => console.log('toggle play'), trigger: 'keyup' },
], { modKey: 'ctrl' })

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
