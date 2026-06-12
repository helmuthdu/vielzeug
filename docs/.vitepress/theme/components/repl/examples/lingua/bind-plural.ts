export const bindPluralExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

// bindPlural() returns a reusable function for a plural branch key.
// Unlike bind(), each call does a fresh lookup — plural form depends on count.
const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: {
      inbox: { zero: 'No messages', one: 'One message', other: '{count} messages' },
      alerts: 'One alert|{count} alerts',
      position: { one: '{count}st', two: '{count}nd', few: '{count}rd', other: '{count}th' },
    },
    de: {
      inbox: { zero: 'Keine Nachrichten', one: 'Eine Nachricht', other: '{count} Nachrichten' },
      alerts: 'Eine Benachrichtigung|{count} Benachrichtigungen',
      position: { one: '{count}.', two: '{count}.', few: '{count}.', other: '{count}.' },
    },
  },
})

const inbox = i18n.bindPlural('inbox')
const alerts = i18n.bindPlural('alerts')
const position = i18n.bindPlural('position')

console.log(inbox(0))                      // 'No messages'
console.log(inbox(1))                      // 'One message'
console.log(inbox(5))                      // '5 messages'
console.log(alerts(3))                     // '3 alerts'
console.log(position(1, { ordinal: true })) // '1st'
console.log(position(2, { ordinal: true })) // '2nd'
console.log(position(3, { ordinal: true })) // '3rd'

// bindPlural follows locale changes automatically
await i18n.setLocale('de')
console.log(inbox(1))  // 'Eine Nachricht'
console.log(inbox(5))  // '5 Nachrichten'`,
  name: 'bindPlural()',
};
