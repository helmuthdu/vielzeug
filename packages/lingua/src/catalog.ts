import { compileCatalog } from './_catalog';
import type { TranslationStore } from './i18n';
import type { Catalog, TextKey } from './types';

/** Enumerate every message key in a catalog as a dotted path.
 *
 *  Traverses nested grouping objects and explicit `{ plural: ... }` messages,
 *  producing the same dotted paths that `TextKey<C>` represents at the type
 *  level. Use this to derive key arrays from the catalog itself instead of
 *  maintaining a parallel list that can go stale.
 *
 *  Pass a `TranslationStore` to enumerate keys from its current locale catalog
 *  without specifying a locale explicitly.
 *
 *  @example
 *  ```ts
 *  const messages = {
 *    nav: { home: '...', settings: '...' },
 *  };
 *  const keys = catalogKeys(messages); // ['nav.home', 'nav.settings']
 *
 *  // From a translation store — uses current locale's catalog
 *  const i18n = createTranslationStore({ catalogs: { en: messages }, locale: 'en' });
 *  const allKeys = catalogKeys(i18n);
 *  ```
 */
export function catalogKeys<C extends Catalog>(store: TranslationStore<C>): ReadonlyArray<TextKey<C>>;
export function catalogKeys<C extends Catalog>(catalog: C): ReadonlyArray<TextKey<C>>;
export function catalogKeys(source: unknown): ReadonlyArray<TextKey<Catalog>> {
  const catalog =
    typeof source === 'object' && source !== null && 'serialize' in source && 'getSnapshot' in source
      ? (source as TranslationStore).serialize().catalogs[(source as TranslationStore).locale]
      : (source as Catalog);

  return [...compileCatalog(catalog).keys()] as unknown as ReadonlyArray<TextKey<Catalog>>;
}
