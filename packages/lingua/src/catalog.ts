import { compileCatalog } from './_catalog';
import { LinguaMissingCatalogError } from './errors';
import type { I18n } from './i18n';
import type { Catalog, MessageKey } from './types';

/** Enumerate every message key in a catalog as a dotted path.
 *
 *  Traverses nested grouping objects and explicit `{ plural: ... }` messages,
 *  producing the same dotted paths that `MessageKey<C>` represents at the type
 *  level. Use this to derive key arrays from the catalog itself instead of
 *  maintaining a parallel list that can go stale.
 *
 *  Pass an `I18n` instance to enumerate keys from its current locale catalog
 *  without specifying a locale explicitly.
 *
 *  @example
 *  ```ts
 *  const messages = {
 *    nav: { home: '...', settings: '...' },
 *  };
 *  const keys = catalogKeys(messages); // ['nav.home', 'nav.settings']
 *
 *  // From an i18n instance — uses current locale's catalog
 *  const i18n = createI18n({ catalogs: { en: messages }, locale: 'en' });
 *  const allKeys = catalogKeys(i18n);
 *  ```
 */
export function catalogKeys<C extends Catalog>(i18n: I18n<C>): ReadonlyArray<MessageKey<C>>;
export function catalogKeys<C extends Catalog>(catalog: C): ReadonlyArray<MessageKey<C>>;
export function catalogKeys(source: unknown): ReadonlyArray<MessageKey<Catalog>> {
  if (typeof source === 'object' && source !== null && 'serialize' in source && 'getSnapshot' in source) {
    const i18n = source as I18n;
    const catalog = i18n.serialize().catalogs[i18n.locale];

    if (!catalog) throw new LinguaMissingCatalogError(`No catalog loaded for locale "${i18n.locale}".`);

    return [...compileCatalog(catalog).keys()] as unknown as ReadonlyArray<MessageKey<Catalog>>;
  }

  return [...compileCatalog(source as Catalog).keys()] as unknown as ReadonlyArray<MessageKey<Catalog>>;
}
