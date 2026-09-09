export const shortcutUtilitiesExample = {
  code: `import { createKeymap, formatShortcut, findShortcutConflicts } from '@vielzeug/keymap'

// listBindings() — inspect active bindings at runtime.
// Each entry has id, shortcut (parsed steps), trigger, preventDefault, and stopPropagation.
const map = createKeymap(
  [
    { id: 'ctrl-k', shortcut: 'ctrl+k', handler: () => console.log('ctrl+k fired') },
    { id: 'save', shortcut: 'ctrl+shift+s', handler: () => console.log('save fired'), trigger: 'keyup' },
    { id: 'close', shortcut: 'escape', handler: () => console.log('close'), preventDefault: false },
  ],
  { modKey: 'ctrl' },
)

const entries = map.listBindings()
console.log('Bindings:', entries.length)

for (const entry of entries) {
  console.log(\`  \${entry.id}: trigger=\${entry.trigger}, preventDefault=\${entry.preventDefault}, stopPropagation=\${entry.stopPropagation}\`)
}

// formatShortcut() — display labels for UI tooltips or menus.
console.log(formatShortcut('ctrl+k', 'ctrl'))         // 'Ctrl+K'
console.log(formatShortcut('mod+shift+p', 'meta'))    // '⇧⌘P'

// bind() returns an unbind closure — removes by binding id.
const unbind = map.bind({ id: 'ctrl-j', shortcut: 'ctrl+j', handler: () => console.log('ctrl+j') })
console.log('After bind:', map.listBindings().length)

unbind()
console.log('After unbind:', map.listBindings().length)

// unbind() removes by id, not by shortcut string — duplicate shortcuts coexist.
map.bind({ id: 'dup-a', shortcut: 'ctrl+d', handler: () => console.log('a') })
map.bind({ id: 'dup-b', shortcut: 'ctrl+d', handler: () => console.log('b') })
console.log('Duplicate shortcut bindings:', map.listBindings().filter(e => e.shortcut.length === 1 && e.shortcut[0].key === 'd').length)

map.unbind('dup-a')
console.log('After unbind dup-a:', map.listBindings().filter(e => e.shortcut.length === 1 && e.shortcut[0].key === 'd').length)

// findShortcutConflicts() — check before binding a user-customized shortcut.
console.log('ctrl+k conflicts:', findShortcutConflicts('ctrl+k', map.listBindings()).length)`,
  name: 'Shortcut Utilities',
};
