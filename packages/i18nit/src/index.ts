/** @vielzeug/i18nit — Lightweight, type-safe i18n library. */

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  DiagnosticEvent,
  DurationFormatOptions,
  DurationValue,
  FormatInput,
  FormatKind,
  I18n,
  I18nOptions,
  Loader,
  Locale,
  LocaleChangeEvent,
  LocaleChangeReason,
  MessageBranchKeys,
  MessageLeafKeys,
  Messages,
  Unsubscribe,
  Vars,
} from './types';

// ─── Diagnostic Helpers ────────────────────────────────────────────────────────
export { isLoaderError, isSubscriberError } from './i18n';

// ─── Instance & factory ───────────────────────────────────────────────────────
export { createI18n } from './i18n';
