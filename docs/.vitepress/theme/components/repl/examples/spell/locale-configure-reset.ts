export const messagesOverrideExample = {
  code: `// Override validation messages, redirect the logger, then restore built-in defaults.
import { resetMessages, setLogger, setMessages, s } from '@vielzeug/spell'

setMessages({
  string: { email: () => 'Use a valid work email address' },
  number: { min: ({ min }) => 'Use a value >= ' + min },
})

const emailResult = s.string().email().safeParse('nope')
const numberResult = s.number().min(5).safeParse(1)
console.log('custom email:', emailResult.success ? 'ok' : emailResult.error.issues[0].message)
console.log('custom number:', numberResult.success ? 'ok' : numberResult.error.issues[0].message)

// Redirect internal dev warnings to a custom sink
setLogger((msg) => console.log('[spell warn]', msg))

// Restore built-in messages and logger
resetMessages()
const defaultResult = s.string().email().safeParse('nope')
console.log('after reset:', defaultResult.success ? 'ok' : defaultResult.error.issues[0].message)`,
  name: 'Message Overrides',
};
