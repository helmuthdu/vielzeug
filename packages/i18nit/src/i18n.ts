import type {
  AnyKey,
  I18n,
  I18nOptions,
  I18nSnapshot,
  Loader,
  Locale,
  LocaleSource,
  MessageBranchKeys,
  MessageLeafKeys,
  Messages,
  MissingInfo,
  PluralTranslateOptions,
  ScopedI18n,
  SubscribeOptions,
  TranslateVars,
  Unsubscribe,
} from './types';

import { type Formatter, createFormatter } from './format';

type PluralRuleSelector = { select: (count: number) => string };
type PluralCaches = Map<string, PluralRuleSelector>;
type LocaleRecord<M extends Messages> =
  | { kind: 'dynamic'; loader: Loader<M>; loadingTask?: Promise<void> }
  | { kind: 'static'; messages: M };

function makeRecord<M extends Messages>(source: LocaleSource<M>): LocaleRecord<M> {
  return typeof source === 'function'
    ? { kind: 'dynamic', loader: source as Loader<M> }
    : { kind: 'static', messages: source as M };
}

const INTERPOLATION_PATTERN = /\{([\p{ID_Continue}-]+)\}/gu;

const CARDINAL_FALLBACK: PluralRuleSelector = { select: (n) => (n === 1 ? 'one' : 'other') };

function canon(locale: string): string {
  try {
    return Intl.getCanonicalLocales(locale)[0] ?? 'en';
  } catch {
    // Invalid BCP 47 tag — reject rather than store arbitrary strings as locale keys.
    return 'en';
  }
}

function buildLocaleChain(locale: Locale, fallback: Locale[]): { chain: Locale[]; set: Set<Locale> } {
  const set = new Set<Locale>();

  for (const value of [locale, ...fallback]) {
    set.add(value);

    const parts = value.split('-');

    for (let i = parts.length - 1; i > 0; i--) {
      set.add(parts.slice(0, i).join('-'));
    }
  }

  return { chain: [...set], set };
}

function selectPluralForm(cache: PluralCaches, locale: Locale, count: number, ordinal: boolean): string {
  const key = `${locale}:${ordinal ? 'ordinal' : 'cardinal'}`;
  let rules = cache.get(key);

  if (!rules) {
    try {
      rules = new Intl.PluralRules(locale, { type: ordinal ? 'ordinal' : 'cardinal' });
    } catch {
      rules = CARDINAL_FALLBACK;
    }

    cache.set(key, rules);
  }

  return rules.select(count);
}

function interpolate(
  template: string,
  vars: TranslateVars | undefined,
  key: string,
  locale: Locale,
  onMissing: (info: MissingInfo) => string,
): string {
  if (!template.includes('{')) return template;

  return template.replace(INTERPOLATION_PATTERN, (_match, varName: string) => {
    const value = vars?.[varName];

    if (value == null) {
      return onMissing({ key, locale, type: 'var', varName });
    }

    return String(value);
  });
}

/** Overload: explicit type parameter (strict typing) */
export function createI18n<M extends Messages>(config: I18nOptions<M>): I18n<M>;
/** Overload: no type parameter (loose typing, allows heterogeneous catalogs) */
export function createI18n(config?: I18nOptions<Messages>): I18n<Messages>;
export function createI18n<M extends Messages = Messages>(config?: I18nOptions<M>): I18n<M> {
  const cfg = (config ?? {}) as I18nOptions<M>;
  let locale = canon(cfg.locale ?? 'en');
  const fallback = Array.isArray(cfg.fallback) ? cfg.fallback.map(canon) : cfg.fallback ? [canon(cfg.fallback)] : [];

  const registry = new Map<Locale, LocaleRecord<M>>();
  const subscribers = new Set<(snapshot: I18nSnapshot) => void>();
  const pluralCache: PluralCaches = new Map();
  const onMissing =
    cfg.onMissing ??
    ((info: MissingInfo) => {
      if (info.type === 'key') return info.key;

      return `{${info.varName}}`;
    });
  const onSubscriberError =
    cfg.onSubscriberError ?? ((error: unknown) => console.error('[i18nit] subscriber error', error));

  let version = 0;
  let snapshot: I18nSnapshot = { locale, version };
  let { chain: activeChain, set: activeChainSet } = buildLocaleChain(locale, fallback);
  let switchId = 0;
  let _fmt: Formatter | undefined;
  const scopeCache = new Map<string, ScopedI18n>();

  const bump = (): void => {
    version++;
    snapshot = { locale, version };

    const listeners = [...subscribers];

    for (const listener of listeners) {
      try {
        listener(snapshot);
      } catch (error) {
        onSubscriberError(error);
      }
    }
  };

  const findMessage = (key: string): string | undefined => {
    const parts = key.split('.');

    for (const candidate of activeChain) {
      const entry = registry.get(candidate);

      if (entry?.kind !== 'static') continue;

      let value: unknown = entry.messages;

      for (const part of parts) {
        if (value == null || typeof value !== 'object') {
          value = undefined;
          break;
        }

        if (!Object.hasOwn(value as object, part)) {
          value = undefined;
          break;
        }

        value = (value as Record<string, unknown>)[part];
      }

      if (typeof value === 'string') return value;
    }

    return undefined;
  };

  const register = (loc: Locale, source: LocaleSource<M>): void => {
    const normalized = canon(loc);
    const existing = registry.get(normalized);

    // Skip if the source reference hasn't changed — avoids spurious subscriber notifications.
    if (
      (existing?.kind === 'static' && source === existing.messages) ||
      (existing?.kind === 'dynamic' && source === existing.loader)
    ) {
      return;
    }

    registry.set(normalized, makeRecord(source));

    if (activeChainSet.has(normalized)) bump();
  };

  if (cfg.catalogs) {
    for (const [loc, source] of Object.entries(cfg.catalogs)) {
      registry.set(canon(loc), makeRecord(source as LocaleSource<M>));
    }
  }

  const preload = (loc: Locale): Promise<void> => {
    const normalized = canon(loc);
    const entry = registry.get(normalized);

    if (!entry) return Promise.reject(new Error(`[i18nit/E001] Missing locale source for "${normalized}".`));

    if (entry.kind === 'static') return Promise.resolve();

    if (entry.loadingTask) return entry.loadingTask;

    // Assign the task synchronously so concurrent calls deduplicate against this entry.
    entry.loadingTask = entry.loader().then(
      (messages) => {
        // Discard if the entry was replaced by a concurrent register() call.
        if (registry.get(normalized) !== entry) return;

        registry.set(normalized, { kind: 'static', messages });

        if (activeChainSet.has(normalized)) bump();
      },
      (error: unknown) => {
        // Clear so the next preload() call can retry after a loader failure.
        if (registry.get(normalized) === entry) entry.loadingTask = undefined;

        throw error;
      },
    );

    return entry.loadingTask;
  };

  const translate = (key: MessageLeafKeys<M> | AnyKey, vars?: TranslateVars): string => {
    const base = String(key);
    const message = findMessage(base);

    return message === undefined
      ? onMissing({ key: base, locale, type: 'key' })
      : interpolate(message, vars, base, locale, onMissing);
  };

  const translatePlural = (
    key: MessageBranchKeys<M> | AnyKey,
    count: number,
    options?: PluralTranslateOptions,
  ): string => {
    if (!Number.isFinite(count)) {
      throw new TypeError('[i18nit/E002] `count` must be a finite number.');
    }

    if (options?.vars && Object.hasOwn(options.vars, 'count')) {
      throw new Error('[i18nit/E003] `tp` does not allow `vars.count`; `count` is injected automatically.');
    }

    const base = String(key);
    const ordinal = options?.ordinal === true;
    const form = selectPluralForm(pluralCache, locale, count, ordinal);
    const selectedKey = !ordinal && count === 0 ? `${base}.zero` : `${base}.${form}`;
    const message = findMessage(selectedKey) ?? findMessage(`${base}.other`);

    if (message === undefined) {
      return onMissing({ key: base, locale, type: 'key' });
    }

    return interpolate(message, options?.vars ? { ...options.vars, count } : { count }, base, locale, onMissing);
  };

  return {
    get fmt() {
      _fmt ??= createFormatter(() => locale);

      return _fmt;
    },

    getSnapshot() {
      return snapshot;
    },

    getSupportedLocales(options): Locale[] {
      const locales = [...registry.keys()];

      // Code-point sort: deterministic across all environments and locales.
      return options?.sorted === true ? locales.sort() : locales;
    },

    has(key: MessageLeafKeys<M> | AnyKey): boolean {
      return findMessage(String(key)) !== undefined;
    },

    get locale(): Locale {
      return locale;
    },

    preload,

    register,

    scope(prefix: MessageBranchKeys<M> | AnyKey): ScopedI18n {
      const pre = String(prefix);
      let cached = scopeCache.get(pre);

      if (!cached) {
        cached = {
          has: (key) => findMessage(`${pre}.${key}`) !== undefined,
          t: (key, vars?) => translate(`${pre}.${key}`, vars),
          tp: (key, count, options?) => translatePlural(`${pre}.${key}`, count, options),
        };
        scopeCache.set(pre, cached);
      }

      return cached;
    },

    async setLocale(next: Locale): Promise<void> {
      const normalized = canon(next);

      if (locale === normalized) return;

      const id = ++switchId;

      await preload(normalized);

      if (id !== switchId) return;

      locale = normalized;
      ({ chain: activeChain, set: activeChainSet } = buildLocaleChain(locale, fallback));
      _fmt?.clear();
      bump();
    },

    subscribe(callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions): Unsubscribe {
      subscribers.add(callback);

      if (options?.immediate === true) {
        try {
          callback(snapshot);
        } catch (error) {
          onSubscriberError(error);
        }
      }

      return () => subscribers.delete(callback);
    },

    t: translate,
    tp: translatePlural,
  };
}
