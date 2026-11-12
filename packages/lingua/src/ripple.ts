import { fromSubscribable, type Readable } from '@vielzeug/ripple';

import type { I18n } from './i18n';
import type { Translator } from './translator';
import type { Catalog, Locale, PluralOptions, TranslateOptions } from './types';

/** A lingua instance mirrored into ripple readables so templates react to locale changes. */
export interface ReactiveI18n<C extends Catalog> {
  /** The underlying instance for imperative work (`setLocale`, `load`, disposal). */
  readonly i18n: I18n<C>;
  /** Reactive locale: reading it inside a computed/template registers the dependency. */
  readonly locale: Readable<Locale>;
  /** Translate a text or plural key; re-evaluates whenever the locale changes. */
  readonly translate: Translator<C>['translate'];
}

/**
 * Bridges a lingua instance into ripple so translated strings are reactive.
 *
 * `i18n.translate()` is not ripple-reactive on its own: reading it inside a `computed()`
 * computes once and never re-runs, since it registers no tracked dependency. The bridge's
 * `translate` reads the reactive {@link ReactiveI18n.locale} first, so any binding built on
 * it re-evaluates the instant `setLocale()` resolves.
 */
export function createReactiveI18n<C extends Catalog>(i18n: I18n<C>): ReactiveI18n<C> {
  const locale = fromSubscribable<Locale>({
    getSnapshot: () => i18n.getSnapshot(),
    subscribe: (listener) => i18n.subscribe(() => listener()),
  });

  const translate = (key: string, options?: TranslateOptions | PluralOptions): string => {
    void locale.value;
    return i18n.translate(key as never, options as never);
  };

  return { i18n, locale, translate: translate as ReactiveI18n<C>['translate'] };
}
