export const staticTranslatorExample = {
  code: `import { createTranslator } from '@vielzeug/lingua'

// Immutable translator: explicit text and plural catalog nodes.
const translator = createTranslator({
  en: {
    greeting: 'Hello, {name}!',
    inbox: { plural: { one: 'One message', other: '{count} messages' } },
  },
  fr: {
    greeting: 'Bonjour, {name} !',
    inbox: { plural: { one: 'Un message', other: '{count} messages' } },
  },
}, { locale: 'fr' })

console.log(translator.translate('greeting', { values: { name: 'Ada' } }))
console.log(translator.translate('inbox', { count: 3 }))`,
  name: 'Static Translator',
};
