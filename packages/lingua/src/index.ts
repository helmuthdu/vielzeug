/**
 * /lingua — Lightweight, type-safe i18n runtime.
 *
 * @security `t()` and `tp()` return raw strings with no HTML sanitization.
 * If catalog content can originate from untrusted sources (user-generated content,
 * external CMS, writable APIs), sanitize translated strings before inserting them
 * into the DOM via `innerHTML`. Rendering via `.textContent` is always safe.
 */

export type {
  I18n,
  I18nOptions,
  I18nSnapshot,
  I18nState,
  Loader,
  Locale,
  LocaleSource,
  MessageBranchKeys,
  MessageLeafKeys,
  Messages,
  NamespaceFactory,
  ScopedI18n,
  SubscribeOptions,
  TpOptions,
  TranslateVars,
  Unsubscribe,
  ValidationWarning,
} from './i18n';

export type { DurationFormatOptions, DurationValue, Formatter, ListFormatOptions } from './format';

export { createFormatter } from './format';
export { createI18n } from './i18n';
