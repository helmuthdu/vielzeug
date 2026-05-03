export const arrayFormattingExample = {
  code: `import { createI18n } from '@vielzeug/i18nit'

const i18n = createI18n({ locale: 'en' })

const list = i18n.format({ kind: 'list', value: ['apple', 'banana', 'orange'] })
console.log('List:', list)`,
  name: 'Array Formatting',
};
