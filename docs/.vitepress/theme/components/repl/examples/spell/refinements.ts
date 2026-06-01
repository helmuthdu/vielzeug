export const refinementsExample = {
  code: `// check() and refine() — sync domain rules beyond built-in constraints
import { s } from '@vielzeug/spell'

const reserved = new Set(['admin', 'root'])

// check() with ctx gives you full control over the issue code and message
const Username = s.string().min(3).check((value, ctx) => {
  if (reserved.has(value)) {
    ctx.addIssue({ code: 'custom', message: value + ' is reserved' })
  }
})

// refine() is the predicate-only shorthand — same semantics, less ceremony
const EvenPort = s.number().int().min(1).max(65535)
  .refine((n) => n % 2 === 0, () => 'Port must be even')

for (const name of ['ad', 'admin', 'grace']) {
  const r = Username.safeParse(name)
  console.log(name, '->', r.success ? 'ok' : r.error.issues[0].message)
}

for (const port of [8080, 3001, 443]) {
  const r = EvenPort.safeParse(port)
  console.log('port', port, '->', r.success ? 'ok' : r.error.issues[0].message)
}`,
  name: 'Custom Checks',
};
