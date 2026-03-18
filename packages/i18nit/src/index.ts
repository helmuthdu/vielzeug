/** @vielzeug/i18nit — Lightweight, type-safe i18n library. */

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  BoundI18n,
  DeepPartialMessages,
  DiagnosticEvent,
  I18nOptions,
  Loader,
  Locale,
  LocaleChangeEvent,
  LocaleChangeListener,
  LocaleChangeReason,
  Messages,
  MessageValue,
  NamespaceKeys,
  PluralForm,
  PluralKeys,
  PluralMessages,
  TranslationKey,
  TranslationKeyParam,
  Unsubscribe,
  Vars,
} from './types';

// ─── Instance & factory ───────────────────────────────────────────────────────
export { createI18n, I18n } from './i18n';
