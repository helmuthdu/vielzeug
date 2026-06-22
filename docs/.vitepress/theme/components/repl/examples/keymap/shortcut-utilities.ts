export const shortcutUtilitiesExample = {
  code: `import {
  canonicalizeShortcut,
  createKeymap,
  detectModKey,
  parseShortcut,
  parseStep,
} from '@vielzeug/keymap'

// detectModKey() — platform modifier detection.
const modKey = detectModKey()
console.log('Platform modifier:', modKey)

// parseStep() — parse a single chord step (no throw on invalid input).
const step = parseStep('ctrl+k', modKey)
console.log('parseStep ctrl+k:', step?.key, [...(step?.modifiers ?? [])])

const invalid = parseStep('', modKey)
console.log('parseStep empty string:', invalid)  // null

// canonicalizeShortcut() — stable canonical key for conflict detection.
// Different aliases for the same shortcut resolve to the same canonical key.
const a = canonicalizeShortcut(parseShortcut('cmd+k', modKey))
const b = canonicalizeShortcut(parseShortcut('meta+k', modKey))
console.log('cmd+k canonical:', a)
console.log('meta+k canonical:', b)
console.log('Same canonical?', a === b)

// listBindings() — inspect active bindings at runtime.
const map = createKeymap(
  {
    'ctrl+k': () => console.log('ctrl+k fired'),
    'ctrl+shift+s': { handler: () => console.log('save fired'), priority: 5, trigger: 'keyup' },
  },
  { modKey },
)

const entries = map.listBindings()
console.log('Bindings:', entries.length)

for (const entry of entries) {
  const canonical = canonicalizeShortcut(entry.shortcut)
  console.log(\`  \${canonical} — trigger: \${entry.trigger}, priority: \${entry.priority}\`)
}

// bind() returns an unbind closure — uses canonical key internally.
const unbind = map.bind('ctrl+j', () => console.log('ctrl+j'))
console.log('After bind:', map.listBindings().length)

unbind()
console.log('After unbind:', map.listBindings().length)`,
  name: 'Shortcut Utilities',
};
