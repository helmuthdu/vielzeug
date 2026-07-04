export const conflictDetectionExample = {
  code: `import { createKeymap, findShortcutConflicts } from '@vielzeug/keymap'

// findShortcutConflicts() catches unreachable bindings before you register them —
// useful for a shortcut-customization UI driven by user input.
const map = createKeymap({
  g: () => console.log('go to top'),
})

const proposed = 'g g'
const conflicts = findShortcutConflicts(proposed, map.listBindings())

if (conflicts.length > 0) {
  console.log(\`"\${proposed}" would never fire — shadowed by an existing binding\`)
} else {
  map.bind(proposed, () => console.log('go to bottom'))
}

// A shortcut with no relationship to existing bindings reports no conflicts.
console.log('ctrl+s conflicts:', findShortcutConflicts('ctrl+s', map.listBindings()).length)

// keydown and keyup bindings never conflict — they're matched independently.
const withKeyup = createKeymap({ space: { handler: () => {}, trigger: 'keyup' } })
console.log(
  'space (keydown) vs space (keyup):',
  findShortcutConflicts('space', withKeyup.listBindings(), { trigger: 'keydown' }).length,
)`,
  name: 'Conflict Detection',
};
