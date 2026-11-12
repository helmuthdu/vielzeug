export const pluralsExample = {
  code: `import { createTranslator } from '@vielzeug/lingua'

// Plural intent is explicit: { plural: ... } nodes select forms through Intl.PluralRules.
const translator = createTranslator(
  {
    inbox: { plural: { one: 'One message', other: '{count} messages' } },
    placement: { plural: { one: '{count}st', two: '{count}nd', few: '{count}rd', other: '{count}th' } },
  },
  { locale: 'en' },
)

console.log(translator.translate('inbox', { count: 0 }))
console.log(translator.translate('inbox', { count: 1 }))
console.log(translator.translate('placement', { count: 2, ordinal: true }))`,
  name: 'Plural Messages',
};
