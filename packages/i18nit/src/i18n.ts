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
  SubscribeOptions,
  TranslateVars,
  Unsubscribe,
} from './types';

type PluralRuleSelector = { select: (count: number) => string };
type PluralCaches = Map<string, PluralRuleSelector>;
type LocaleRecord<M extends Messages> =
  | { kind: 'dynamic'; loader: Loader<M>; messages?: M }
  | { kind: 'static'; messages: M };
type LoadingRecord<M extends Messages> = {
  entry: Extract<LocaleRecord<M>, { kind: 'dynamic' }>;
  task: Promise<void>;
};

const INTERPOLATION_PATTERN = /\{([\p{ID_Continue}\-.]+)\}/gu;

function canon(locale: string): string {
  try {
    return Intl.getCanonicalLocales(locale)[0] ?? locale;
  } catch {
    return locale;
  }
}

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  let value: unknown = obj;

  for (const part of path.split('.')) {
    if (value == null || typeof value !== 'object') return undefined;

    if (!Object.hasOwn(value as object, part)) return undefined;

    value = (value as Record<string, unknown>)[part];
  }

  return value;
}

function buildLocaleChain(locale: Locale, fallback: Locale[]): Locale[] {
  const seen = new Set<Locale>();

  for (const value of [locale, ...fallback]) {
    seen.add(value);

    const parts = value.split('-');

    for (let i = parts.length - 1; i > 0; i--) {
      seen.add(parts.slice(0, i).join('-'));
    }
  }

  return [...seen];
}

function selectPluralForm(cache: PluralCaches, locale: Locale, count: number, ordinal: boolean): string {
  const key = `${locale}:${ordinal ? 'ordinal' : 'cardinal'}`;
  let rules = cache.get(key);

  if (!rules) {
    try {
      rules = new Intl.PluralRules(locale, { type: ordinal ? 'ordinal' : 'cardinal' });
    } catch {
      rules = { select: (value: number) => (value === 1 ? 'one' : 'other') };
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
    const value = vars != null ? resolvePath(vars, varName) : undefined;

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
  const loading = new Map<Locale, LoadingRecord<M>>();
  const subscribers = new Set<(snapshot: I18nSnapshot) => void>();
  const pluralCache: PluralCaches = new Map();
  const onMissing =
    cfg.onMissing ??
    ((info: MissingInfo) => {
      if (info.type === 'key') return info.key;

      return `{${info.varName}}`;
    });
  const onSubscriberError = cfg.onSubscriberError ?? (() => {});

  let version = 0;
  let snapshot: I18nSnapshot = { locale, version };
  let activeChain = buildLocaleChain(locale, fallback);
  let switchId = 0;

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

  const addListener = (callback: (snapshot: I18nSnapshot) => void, immediate = false): Unsubscribe => {
    subscribers.add(callback);

    if (immediate) {
      try {
        callback(snapshot);
      } catch (error) {
        onSubscriberError(error);
      }
    }

    return () => subscribers.delete(callback);
  };

  const findMessage = (key: string): string | undefined => {
    for (const candidate of activeChain) {
      const messages = registry.get(candidate)?.messages;

      if (!messages) continue;

      const value = resolvePath(messages, key);

      if (typeof value === 'string') return value;
    }

    return undefined;
  };

  const setLocaleSource = (normalized: Locale, source: LocaleSource<M>): void => {
    if (typeof source === 'function') {
      registry.set(normalized, { kind: 'dynamic', loader: source as Loader<M> });

      return;
    }

    registry.set(normalized, { kind: 'static', messages: source as M });
  };

  const register = (loc: Locale, source: LocaleSource<M>): void => {
    const normalized = canon(loc);

    setLocaleSource(normalized, source);

    if (activeChain.includes(normalized)) bump();
  };

  if (cfg.catalogs) {
    for (const [loc, source] of Object.entries(cfg.catalogs)) {
      setLocaleSource(canon(loc), source as LocaleSource<M>);
    }
  }

  const preload = async (loc: Locale): Promise<void> => {
    const normalized = canon(loc);
    const entry = registry.get(normalized);

    if (!entry) {
      throw new Error(`Missing locale source for "${normalized}".`);
    }

    if (entry.kind === 'static') return;

    if (entry.messages) return;

    const active = loading.get(normalized);

    if (active?.entry === entry) {
      await active.task;

      return;
    }

    const task = (async () => {
      const messages = await entry.loader(normalized);

      // Only apply if the registry entry is still the exact object we started
      // loading from. Any call to register() replaces the entry with a new
      // object, so a stale loader result from a superseded source is discarded.
      if (registry.get(normalized) !== entry) return;

      entry.messages = messages;

      if (activeChain.includes(normalized)) bump();
    })();

    loading.set(normalized, { entry, task });

    try {
      await task;
    } finally {
      if (loading.get(normalized)?.task === task) {
        loading.delete(normalized);
      }
    }
  };

  function translate(key: MessageLeafKeys<M> | AnyKey, vars?: TranslateVars): string {
    const base = String(key);
    const message = findMessage(base);

    return message === undefined
      ? onMissing({ key: base, locale, type: 'key' })
      : interpolate(message, vars, base, locale, onMissing);
  }

  function translatePlural(
    key: MessageBranchKeys<M> | AnyKey,
    count: number,
    options?: PluralTranslateOptions,
  ): string {
    if (!Number.isFinite(count)) {
      throw new TypeError('`count` must be a finite number.');
    }

    if (options?.vars && Object.hasOwn(options.vars, 'count')) {
      throw new Error('`tp` does not allow `vars.count`; `count` is injected automatically.');
    }

    const base = String(key);
    const ordinal = options?.ordinal === true;
    const form = selectPluralForm(pluralCache, locale, count, ordinal);
    const selectedKey = !ordinal && count === 0 ? `${base}.zero` : `${base}.${form}`;
    const message = findMessage(selectedKey) ?? findMessage(`${base}.other`);

    if (message === undefined) {
      return onMissing({ key: base, locale, type: 'key' });
    }

    return interpolate(message, { ...(options?.vars ?? {}), count }, base, locale, onMissing);
  }

  return {
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

    async setLocale(next: Locale): Promise<void> {
      const normalized = canon(next);

      if (locale === normalized) return;

      const id = ++switchId;

      await preload(normalized);

      if (id !== switchId) return;

      locale = normalized;
      activeChain = buildLocaleChain(locale, fallback);
      bump();
    },

    subscribe(callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions): Unsubscribe {
      return addListener(callback, options?.immediate === true);
    },

    t: translate,
    tp: translatePlural,
  };
}
