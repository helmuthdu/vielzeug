export const segmentedPluralsExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

// tpi() — segmented plurals: CLDR selection + count injection like tp(),
// segmented output like ti(). Lets plural messages embed components.

const i18n = createI18n({
  catalogs: {
    en: {
      inbox: {
        zero: 'No messages from {sender}',
        one: 'One message from {sender}',
        other: '{count} messages from {sender}',
      },
    },
  },
})

const ada = { name: 'Ada', role: 'admin' }

// count appears as a raw-number segment; typed vars pass through
console.log(i18n.tpi('inbox', 0, { vars: { sender: ada } }))
// ['No messages from ', { name: 'Ada', ... }]
console.log(i18n.tpi('inbox', 1, { vars: { sender: ada } }))
// ['One message from ', { name: 'Ada', ... }]
console.log(i18n.tpi('inbox', 5, { vars: { sender: ada } }))
// [5, ' messages from ', { name: 'Ada', ... }]

// Need a grouped number? Format it yourself — tpi does not string-ify count:
console.log(i18n.tpi('inbox', 1200, { vars: { sender: ada } }).map((s) => (typeof s === 'number' ? i18n.fmt.number(s) : typeof s === 'string' ? s : s.name)).join(''))

// Same validation as tp(): count must be finite, vars.count is forbidden
try {
  i18n.tpi('inbox', Number.NaN)
} catch (e) {
  console.log('thrown:', e.name)
}

// Ordinal plurals work too
const i18nOrd = createI18n({ catalogs: { en: { place: { one: '{count}st place: {name}', two: '{count}nd place: {name}', other: '{count}th place: {name}' } } } })
console.log(i18nOrd.tpi('place', 2, { ordinal: true, vars: { name: 'Ada' } }))`,
  name: 'Segmented Plurals — tpi() for plural messages with components',
};
