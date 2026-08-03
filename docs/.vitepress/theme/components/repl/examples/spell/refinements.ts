export const refinementsExample = {
  code: `// check() and checkAsync() — explicit custom domain rules
import { s } from '@vielzeug/spell'

const reserved = new Set(['admin', 'root'])

// check() is synchronous; return a string to fail with that message
const Username = s.string().min(3).check((value) =>
  !reserved.has(value) || value + ' is reserved'
)

// check() receives context for multiple issues or custom error codes
const Signup = s.object({ password: s.string().min(8), confirm: s.string() })
  .check((v, ctx) => {
    if (v.password !== v.confirm)
      ctx.addIssue({ code: 'custom', message: 'Passwords must match', path: ['confirm'] })
  })

// check() also covers predicate-only domain rules
const EvenPort = s.number().int().min(1).max(65535)
  .check((n) => n % 2 === 0 || 'Port must be even')

for (const name of ['ad', 'admin', 'grace']) {
  const r = Username.safeParse(name)
  console.log(name, '->', r.success ? 'ok' : r.error.issues[0].message)
}

const signupResult = Signup.safeParse({ password: 'secure123', confirm: 'different' })
console.log('signup:', signupResult.success ? 'ok' : signupResult.error.issues[0].message)

for (const port of [8080, 3001, 443]) {
  const r = EvenPort.safeParse(port)
  console.log('port', port, '->', r.success ? 'ok' : r.error.issues[0].message)
}`,
  name: 'Custom Validation',
};
