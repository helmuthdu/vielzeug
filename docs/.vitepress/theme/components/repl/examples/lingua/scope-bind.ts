export const scopeBindExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: {
      nav: { home: 'Home', about: 'About', contact: 'Contact' },
      inbox: { one: 'One message', other: '{count} messages' },
    },
    de: {
      nav: { home: 'Startseite', about: 'Über uns', contact: 'Kontakt' },
      inbox: { one: 'Eine Nachricht', other: '{count} Nachrichten' },
    },
  },
})

// ── scope() ──────────────────────────────────────────────────────────────────
// scope() returns a { fmt, t, tp, has } helper bound to a key prefix.
const nav = i18n.scope('nav')

console.log('nav.home (en):', nav.t('home'))    // 'Home'
console.log('nav.about (en):', nav.t('about'))  // 'About'
console.log('has nav.contact:', nav.has('contact')) // true

await i18n.setLocale('de')
console.log('nav.home (de):', nav.t('home'))    // 'Startseite'

// scope() is memoized per prefix — same object reference for the same prefix
console.log('same ref?', i18n.scope('nav') === i18n.scope('nav')) // true

// ── has(key, { kind }) ──────────────────────────────────────────────────────
// has() is leaf-only by default (resolvable by t()); { kind: 'branch' } checks
// branch keys (resolvable by tp()).
await i18n.setLocale('en')
console.log('has("inbox"):', i18n.has('inbox'))                                // false — branch, not a leaf
console.log('has("inbox", branch):', i18n.has('inbox', { kind: 'branch' }))    // true — plural branch
console.log('has("inbox.one"):', i18n.has('inbox.one'))                        // true — explicit sub-key
console.log('has("missing"):', i18n.has('missing'))                            // false

// ── isLoaded() ───────────────────────────────────────────────────────────────
// Safe predicate — never throws, even for invalid or unregistered locales.
console.log('isLoaded("en"):', i18n.isLoaded('en')) // true
console.log('isLoaded("fr"):', i18n.isLoaded('fr')) // false (not registered)

// ── loadNamespace(ns, factory) ──────────────────────────────────────────────
// Registers and loads a namespace in one call; deduped per ns + locale.
await i18n.loadNamespace('actions', (locale) => Promise.resolve({
  save: locale === 'de' ? 'Speichern' : 'Save',
  cancel: locale === 'de' ? 'Abbrechen' : 'Cancel',
}))
console.log('actions.save:', i18n.t('save'))   // 'Save' (en)
await i18n.setLocale('de')
await i18n.loadNamespace('actions', (locale) => Promise.resolve({
  save: locale === 'de' ? 'Speichern' : 'Save',
  cancel: locale === 'de' ? 'Abbrechen' : 'Cancel',
}))
console.log('actions.save (de):', i18n.t('save')) // 'Speichern'`,
  name: 'scope(), has(), isLoaded(), loadNamespace()',
};
