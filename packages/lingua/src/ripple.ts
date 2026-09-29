import { fromSubscribable, type Readable } from '@vielzeug/ripple';

import type { I18n } from './i18n';
import type { Catalog, Locale, MessageKey, PluralOptions, TranslateOptions } from './types';

/** A lingua instance mirrored into ripple readables so templates react to locale changes. */
export interface ReactiveI18n<C extends Catalog> {
  /** The underlying instance for imperative work (`setLocale`, `load`, disposal). */
  readonly i18n: I18n<C>;
  /** Reactive locale — reading it inside a computed/template registers the dependency. */
  readonly locale: Readable<Locale>;
  /** Translate a text or plural key; re-evaluates whenever the locale changes. */
  translate(key: MessageKey<C>, options?: TranslateOptions | PluralOptions): string;
  /** Translate a runtime-assembled key; re-evaluates whenever the locale changes. */
  translateDynamic(key: string, options?: TranslateOptions | PluralOptions): string;
}

/**
 * Bridges a lingua instance into ripple so translated strings are reactive.
 *
 * `i18n.translate()` is not ripple-reactive on its own: reading it inside a `computed()`
 * computes once and never re-runs, since it registers no tracked dependency. Both translate
 * methods here first read the reactive {@link ReactiveI18n.locale}, so any binding built on them
 * re-evaluates the instant `setLocale()` resolves.
 */
export function createReactiveI18n<C extends Catalog>(i18n: I18n<C>): ReactiveI18n<C> {
  const locale = fromSubscribable<Locale>({
    getSnapshot: () => i18n.locale,
    subscribe: (listener) => i18n.subscribe(() => listener()),
  });

  return {
    i18n,
    locale,
    translate: (key, options) => {
      void locale.value;
      return i18n.translateDynamic(key, options);
    },
    translateDynamic: (key, options) => {
      void locale.value;
      return i18n.translateDynamic(key, options);
    },
  };
}
