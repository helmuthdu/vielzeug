export const localeConfigureResetExample = {
  code: `// Compose message overrides, switch locale, then reset back to English defaults.
import { configure, currentLocale, registerLocale, reset, s, useLocale } from '@vielzeug/spell'

configure({
  messages: {
    string: { email: () => 'Use a valid work email address' },
  },
})

configure({
  messages: {
    number: { min: ({ min }) => 'Use a value >= ' + min },
  },
})

const emailResult = s.string().email().safeParse('nope')
const numberResult = s.number().min(5).safeParse(1)
console.log('custom email:', emailResult.success ? 'ok' : emailResult.error.issues[0].message)
console.log('custom number:', numberResult.success ? 'ok' : numberResult.error.issues[0].message)

registerLocale('de', { string: { email: () => 'Bitte eine gültige E-Mail-Adresse eingeben' } })
useLocale('de')
const germanResult = s.string().email().safeParse('nope')
console.log('locale:', currentLocale(), '-', germanResult.success ? 'ok' : germanResult.error.issues[0].message)

reset()
const resetResult = s.string().email().safeParse('nope')
console.log('after reset:', currentLocale(), '-', resetResult.success ? 'ok' : resetResult.error.issues[0].message)`,
  name: 'Locale Configure & Reset',
};
