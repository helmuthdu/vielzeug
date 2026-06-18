export const discriminatedUnionExample = {
  code: `// s.variant() validates a discriminated union — objects sharing a common tag field.
// Spell automatically injects the discriminator literal into each branch.
import { s } from '@vielzeug/spell'

const Event = s.variant('type', {
  click: s.object({ x: s.number(), y: s.number() }),
  keydown: s.object({ key: s.string(), repeat: s.boolean() }),
  resize: s.object({ width: s.number(), height: s.number() }),
})

const click = Event.parse({ type: 'click', x: 100, y: 200 })
console.log('click:', click)

const key = Event.parse({ type: 'keydown', key: 'Enter', repeat: false })
console.log('keydown:', key)

// Wrong discriminator value
const bad = Event.safeParse({ type: 'unknown', x: 0 })
console.log('unknown type:', bad.success ? 'ok' : bad.error.issues[0].message)

// Missing required field in matched branch
const missingField = Event.safeParse({ type: 'resize', width: 800 })
console.log('missing height:', missingField.success ? 'ok' : missingField.error.issues[0].message)`,
  name: 'Discriminated Union',
};
