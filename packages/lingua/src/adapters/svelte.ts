export * from '../index.js';

import type { Formatter } from '../format.js';
import type { I18n, Messages } from '../index.js';

/** Svelte readable store shape — compatible with Svelte's `$`-prefix auto-subscription. */
export type SvelteReadable<T> = {
  subscribe(run: (value: T) => void): () => void;
};

export type I18nStore<M extends Messages = Messages> = {
  /** The bound Intl formatter — always reflects the current locale. */
  readonly fmt: Formatter;
  /** The current locale string. */
  locale: string;
  setLocale: I18n<M>['setLocale'];
  t: I18n<M>['t'];
  tp: I18n<M>['tp'];
};

/**
 * Adapts an i18n instance to a Svelte readable store.
 *
 * The subscriber is called immediately with the current state (matching Svelte's store
 * contract), then on every locale change. Use the `$` prefix in components to auto-subscribe.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { createI18n, useI18n } from '@vielzeug/lingua/svelte';
 *
 *   const i18n$ = useI18n(i18n);
 * </script>
 *
 * <p>{$i18n$.t('hello')}</p>
 * <button on:click={() => $i18n$.setLocale('fr')}>Français</button>
 * ```
 */
export const useI18n = <M extends Messages = Messages>(i18n: I18n<M>): SvelteReadable<I18nStore<M>> => ({
  subscribe(run) {
    const emit = (): void =>
      run({
        get fmt() {
          return i18n.fmt;
        },
        locale: i18n.locale,
        setLocale: i18n.setLocale,
        t: i18n.t,
        tp: i18n.tp,
      });

    emit();

    const unsub = i18n.subscribe(() => emit());

    return () => unsub();
  },
});
