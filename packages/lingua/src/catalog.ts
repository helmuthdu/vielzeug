import { compileCatalog } from './_catalog';
import type { Catalog, MessageKey } from './types';

/** Enumerate every message key in a catalog as a dotted path.
 *
 *  Traverses nested grouping objects and explicit `{ plural: ... }` messages,
 *  producing the same dotted paths that `MessageKey<C>` represents at the type
 *  level. Use this to derive key arrays from the catalog itself instead of
 *  maintaining a parallel list that can go stale.
 *
 *  Pass any catalog subtree to enumerate group-scoped keys. For an `I18n`
 *  instance, pass its current locale catalog explicitly.
 *
 *  @example
 *  ```ts
 *  const messages = {
 *    nav: { home: '...', settings: '...' },
 *  };
 *  const keys = catalogKeys(messages); // ['nav.home', 'nav.settings']
 *  const navKeys = catalogKeys(messages.nav); // ['home', 'settings']
 *
 *  // From an i18n instance — read the current locale's catalog first
 *  const i18n = createI18n({ catalogs: { en: messages }, locale: 'en' });
 *  const state = i18n.serialize();
 *  const allKeys = catalogKeys(state.catalogs[state.locale]);
 *  ```
 */
export function catalogKeys<C extends Catalog>(catalog: C): ReadonlyArray<MessageKey<C>> {
  return [...compileCatalog(catalog).keys()] as unknown as ReadonlyArray<MessageKey<C>>;
}
