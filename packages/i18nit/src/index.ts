/** @vielzeug/i18nit — Lightweight, type-safe i18n library. */

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  DiagnosticEvent,
  FormatInput,
  FormatKind,
  I18n,
  I18nOptions,
  Loader,
  Locale,
  LocaleChangeEvent,
  LocaleChangeReason,
  Messages,
  Unsubscribe,
  Vars,
} from './types';

// ─── Diagnostic Helpers ────────────────────────────────────────────────────────
export { isLoaderError, isSubscriberError } from './types';

// ─── Instance & factory ───────────────────────────────────────────────────────
export { createI18n } from './i18n';
