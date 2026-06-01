export const basicSchemaExample = {
  code: `// Validate a signup payload before it enters application state.
import { errorsAt, s } from '@vielzeug/spell'

const Signup = s.object({
  email: s.string().email(),
  password: s.string().min(12),
  referralCode: s.string().optional(),
})

console.log('Accepted:', Signup.parse({
  email: 'ada@example.com',
  password: 'horse-battery-staple',
}))

const invalid = Signup.safeParse({
  email: 'not-an-email',
  password: 'short',
})

if (!invalid.success) {
  const formatted = invalid.error.format()
  console.log('Email errors:', errorsAt(formatted, 'email'))
  console.log('Password errors:', errorsAt(formatted, 'password'))
}`,
  name: 'Basic Schema Validation',
};
