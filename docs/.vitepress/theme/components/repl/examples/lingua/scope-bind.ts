export const scopeBindExample = {
  code: `import { createI18n, createNamespace } from '@vielzeug/lingua'

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: {
      nav: { home: 'Home', about: 'About', contact: 'Contact' },
      inbox: 'One message|{count} messages',
    },
    de: {
      nav: { home: 'Startseite', about: 'Über uns', contact: 'Kontakt' },
      inbox: 'Eine Nachricht|{count} Nachrichten',
    },
  },
})

// ── scope().bind() ───────────────────────────────────────────────────────────
// scope() returns bind/bindPlural alongside t/tp/has — useful in render loops.
const nav = i18n.scope('nav')

const home = nav.bind('home')   // equivalent to i18n.bind('nav.home')
const inbox = nav.bindPlural('inbox') // equivalent to i18n.bindPlural('nav.inbox')
// Note: 'inbox' lives at root but this shows the pattern

const rootInbox = i18n.bindPlural('inbox')

console.log('nav.home (en):', home())   // 'Home'
console.log('inbox 0 (en):', rootInbox(0)) // 'One message'
console.log('inbox 5 (en):', rootInbox(5)) // '5 messages'

// Both bind() and bindPlural() invalidate automatically on locale change
await i18n.setLocale('de')
console.log('nav.home (de):', home())      // 'Startseite'
console.log('inbox 1 (de):', rootInbox(1)) // 'Eine Nachricht'
console.log('inbox 3 (de):', rootInbox(3)) // '3 Nachrichten'

// ── hasBranch() ──────────────────────────────────────────────────────────────
// Pipe-plural shorthand expands into sub-keys — has() returns false for the base.
await i18n.setLocale('en')
console.log('has("inbox"):', i18n.has('inbox'))       // false — expanded away
console.log('hasBranch("inbox"):', i18n.hasBranch('inbox')) // true — inbox.one / inbox.other

// ── isLoaded() ───────────────────────────────────────────────────────────────
// Safe predicate — never throws, even for invalid or unregistered locales.
console.log('isLoaded("en"):', i18n.isLoaded('en'))   // true
console.log('isLoaded("fr"):', i18n.isLoaded('fr'))   // false (not registered)

// ── createNamespace() ────────────────────────────────────────────────────────
// Typed identity helper — enforces catalog shape on a namespace factory.
const actionsFactory = createNamespace((locale) => ({
  save: locale === 'de' ? 'Speichern' : 'Save',
  cancel: locale === 'de' ? 'Abbrechen' : 'Cancel',
}))

i18n.registerNamespace('actions', actionsFactory)
await i18n.loadNamespace('actions')
console.log('actions.save:', i18n.t('save'))   // 'Save' (en)
await i18n.setLocale('de')
await i18n.loadNamespace('actions')
console.log('actions.save (de):', i18n.t('save')) // 'Speichern'`,
  name: 'scope().bind(), hasBranch(), isLoaded(), createNamespace()',
};
