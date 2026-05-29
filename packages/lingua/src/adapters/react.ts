export * from '../index.js';

import type { Formatter } from '../format.js';
import type { I18n, I18nSnapshot, Messages } from '../index.js';

/**
 * `useSyncExternalStore` signature — typed locally so this adapter has no hard
 * dependency on the `react` package.
 */
export type UseSyncExternalStoreFn = <T>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
) => T;

export type UseI18nReturn<M extends Messages = Messages> = {
  /** The bound Intl formatter — always reflects the current locale. */
  readonly fmt: Formatter;
  /** The current locale string. Changes cause the component to re-render. */
  locale: string;
  setLocale: I18n<M>['setLocale'];
  t: I18n<M>['t'];
  tp: I18n<M>['tp'];
};

let _useSyncExternalStore: UseSyncExternalStoreFn | undefined;

/**
 * Registers React's `useSyncExternalStore` with this adapter.
 * Call once at your app entry point before any component uses {@link useI18n}.
 *
 * @example
 * ```ts
 * import { useSyncExternalStore } from 'react';
 * import { init } from '@vielzeug/lingua/react';
 *
 * init(useSyncExternalStore);
 * ```
 */
export const init = (useSyncExternalStore: UseSyncExternalStoreFn): void => {
  _useSyncExternalStore = useSyncExternalStore;
};

/**
 * React hook — subscribes the current component to an i18n instance and
 * re-renders whenever the locale changes. Returns the current locale, `t`, `tp`,
 * `fmt`, and `setLocale` for use in JSX.
 *
 * Uses `useSyncExternalStore` for full concurrent-mode safety.
 *
 * Requires {@link init} to be called once before use.
 *
 * @example
 * ```tsx
 * // main.tsx
 * import { useSyncExternalStore } from 'react';
 * import { init } from '@vielzeug/lingua/react';
 * init(useSyncExternalStore);
 *
 * // App.tsx
 * import { useI18n } from '@vielzeug/lingua/react';
 *
 * function App() {
 *   const { locale, t, setLocale } = useI18n(i18n);
 *   return (
 *     <>
 *       <p>{t('hello')}</p>
 *       <button onClick={() => setLocale('fr')}>Français</button>
 *     </>
 *   );
 * }
 * ```
 */
export const useI18n = <M extends Messages = Messages>(i18n: I18n<M>): UseI18nReturn<M> => {
  if (!_useSyncExternalStore) {
    throw new Error('[lingua/react] Call init(useSyncExternalStore) once at your app entry before using useI18n().');
  }

  _useSyncExternalStore<I18nSnapshot>(
    (onStoreChange) => {
      const unsub = i18n.subscribe(() => onStoreChange());

      return () => unsub();
    },
    () => i18n.getSnapshot(),
  );

  return {
    get fmt() {
      return i18n.fmt;
    },
    locale: i18n.locale,
    setLocale: i18n.setLocale,
    t: i18n.t,
    tp: i18n.tp,
  };
};
