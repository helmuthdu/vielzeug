export * from '../index.js';

import type { Formatter } from '../format.js';
import type {
  AnyKey,
  I18n,
  MessageBranchKeys,
  MessageLeafKeys,
  Messages,
  PluralTranslateOptions,
  TranslateVars,
} from '../index.js';

/**
 * Minimal `shallowRef` signature — matches `shallowRef` from `vue`.
 * Typed locally so this adapter has no hard dependency on the `vue` package.
 */
export type ShallowRefFn = <T>(value: T) => { value: T };

/**
 * Minimal `onScopeDispose` signature — matches `onScopeDispose` from `vue`.
 * Must be called from within an active Vue effect scope (inside `setup()` or a composable).
 */
export type OnScopeDisposeFn = (fn: () => void, failSilently?: boolean) => void;

/** A Vue-compatible readonly ref — a plain object with a reactive `.value`. */
export type VueReadonlyRef<T> = { readonly value: T };

export type UseI18nReturn<M extends Messages = Messages> = {
  /** The bound Intl formatter — always reflects the current locale. */
  readonly fmt: Formatter;
  /** Reactive shallowRef tracking the current locale string. */
  readonly locale: VueReadonlyRef<string>;
  setLocale(next: string): Promise<void>;
  /**
   * Translates a key. When called inside a Vue template, automatically creates a reactive
   * dependency on `locale` so the component re-renders on locale change.
   */
  t(key: AnyKey | MessageLeafKeys<M>, vars?: TranslateVars): string;
  tp(key: AnyKey | MessageBranchKeys<M>, count: number, options?: PluralTranslateOptions): string;
};

let _onScopeDispose: OnScopeDisposeFn | undefined;
let _shallowRef: ShallowRefFn | undefined;

/**
 * Registers Vue's `shallowRef` and `onScopeDispose` with this adapter.
 * Call once at your app entry point before any composable uses {@link useI18n}.
 *
 * @example
 * ```ts
 * import { onScopeDispose, shallowRef } from 'vue';
 * import { init } from '@vielzeug/i18nit/vue';
 *
 * init({ onScopeDispose, shallowRef });
 * ```
 */
export const init = (options: { onScopeDispose: OnScopeDisposeFn; shallowRef: ShallowRefFn }): void => {
  _onScopeDispose = options.onScopeDispose;
  _shallowRef = options.shallowRef;
};

/**
 * Vue composable — bridges an i18n instance into Vue's reactivity system.
 *
 * Returns a frozen `locale` shallowRef that updates whenever the locale changes, plus
 * `t`, `tp`, and `fmt` wrappers that read `locale.value` first so Vue templates
 * automatically re-render on locale switches.
 *
 * The i18n subscription is disposed when the enclosing Vue scope is torn down
 * (component unmount or `effectScope().stop()`).
 *
 * Requires {@link init} to be called once before use.
 *
 * @example
 * ```ts
 * // main.ts
 * import { onScopeDispose, shallowRef } from 'vue';
 * import { init } from '@vielzeug/i18nit/vue';
 * init({ onScopeDispose, shallowRef });
 *
 * // composables/useTranslations.ts
 * import { createI18n, useI18n } from '@vielzeug/i18nit/vue';
 *
 * const i18n = createI18n({ catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } } });
 *
 * export function useTranslations() {
 *   return useI18n(i18n);
 * }
 * ```
 *
 * ```vue
 * <!-- App.vue -->
 * <script setup lang="ts">
 * import { useTranslations } from '@/composables/useTranslations';
 * const { locale, t, setLocale } = useTranslations();
 * </script>
 *
 * <template>
 *   <p>{{ t('hello') }}</p>
 *   <button @click="setLocale('fr')">Français</button>
 * </template>
 * ```
 */
export const useI18n = <M extends Messages = Messages>(i18n: I18n<M>): UseI18nReturn<M> => {
  if (!_onScopeDispose || !_shallowRef) {
    throw new Error(
      '[i18nit/vue] Call init({ onScopeDispose, shallowRef }) once at your app entry before using useI18n().',
    );
  }

  const ref = _shallowRef(i18n.locale);
  const unsub = i18n.subscribe(() => {
    ref.value = i18n.locale;
  });

  _onScopeDispose(unsub, /* failSilently */ true);

  return {
    get fmt() {
      void ref.value; // track reactive dep — template re-renders on locale change

      return i18n.fmt;
    },
    locale: ref as unknown as VueReadonlyRef<string>,
    setLocale: (next) => i18n.setLocale(next),
    t(key, vars?) {
      void ref.value;

      return i18n.t(key, vars);
    },
    tp(key, count, options?) {
      void ref.value;

      return i18n.tp(key, count, options);
    },
  };
};
