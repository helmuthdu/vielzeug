export const basicSchemaExample = {
  code: `// Validate a signup payload before it enters application state.
import { s } from '@vielzeug/spell'

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
  console.log('Email errors:', invalid.error.messagesAt('email'))
  console.log('Password errors:', invalid.error.messagesAt('password'))
}`,
  name: 'Basic Schema Validation',
};
