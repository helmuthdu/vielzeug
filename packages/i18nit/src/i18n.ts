import type {
  I18n,
  I18nOptions,
  Loader,
  Locale,
  LocaleSource,
  MessageBranchKeys,
  MessageLeafKeys,
  Messages,
  MissingInfo,
  SubscribeOptions,
  TranslateOptions,
  TranslateVars,
  Unsubscribe,
} from './types';

type PluralCaches = Map<string, Intl.PluralRules>;
type LocaleRecord<M extends Messages> =
  | { kind: 'dynamic'; loader: Loader<M>; messages?: M }
  | { kind: 'static'; messages: M };

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
      return count === 1 ? 'one' : 'other';
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

export function createI18n<M extends Messages = Messages>(config: I18nOptions<M> = {}): I18n<M> {
  let locale = canon(config.locale ?? 'en');
  const fallback = Array.isArray(config.fallback)
    ? config.fallback.map(canon)
    : config.fallback
      ? [canon(config.fallback)]
      : [];

  const registry = new Map<Locale, LocaleRecord<M>>();
  const loading = new Map<Locale, Promise<void>>();
  const subscribers = new Set<() => void>();
  const pluralCache: PluralCaches = new Map();
  const chainCache = new Map<Locale, Locale[]>();
  const onMissing = config.onMissing ?? ((info: MissingInfo) => (info.type === 'key' ? info.key : ''));

  let version = 0;
  let switchId = 0;

  const getChain = (fromLocale: Locale): Locale[] => {
    const cached = chainCache.get(fromLocale);

    if (cached) return cached;

    const chain = buildLocaleChain(fromLocale, fallback);

    chainCache.set(fromLocale, chain);

    return chain;
  };

  const isInActiveChain = (loc: Locale): boolean => getChain(locale).includes(loc);

  const bump = (): void => {
    version++;

    for (const listener of subscribers) {
      try {
        listener();
      } catch {
        // Ignore failing subscribers so the store remains stable.
      }
    }
  };

  const getMessages = (loc: Locale): M | undefined => {
    const entry = registry.get(loc);

    if (!entry) return undefined;

    return entry.kind === 'static' ? entry.messages : entry.messages;
  };

  const findValue = (key: string, fromLocale: Locale): unknown => {
    for (const candidate of getChain(fromLocale)) {
      const messages = getMessages(candidate);

      if (!messages) continue;

      const value = resolvePath(messages, key);

      if (value !== undefined) return value;
    }

    return undefined;
  };

  const findMessage = (key: string, fromLocale: Locale): string | undefined => {
    const value = findValue(key, fromLocale);

    return typeof value === 'string' ? value : undefined;
  };

  const register = (loc: Locale, source: LocaleSource<M>): void => {
    const normalized = canon(loc);

    if (typeof source === 'function') {
      registry.set(normalized, { kind: 'dynamic', loader: source as Loader<M> });
    } else {
      registry.set(normalized, { kind: 'static', messages: source as M });
    }

    if (isInActiveChain(normalized)) bump();
  };

  if (config.catalogs) {
    for (const [loc, source] of Object.entries(config.catalogs)) {
      register(loc, source as LocaleSource<M>);
    }
  }

  const preload = async (loc: Locale): Promise<void> => {
    const normalized = canon(loc);
    const entry = registry.get(normalized);

    if (!entry) {
      throw new Error(`[i18nit] Missing locale source for locale "${normalized}".`);
    }

    if (entry.kind === 'static') return;

    if (entry.messages) return;

    const active = loading.get(normalized);

    if (active) {
      await active;

      return;
    }

    const task = (async () => {
      const messages = await entry.loader(normalized);
      const latest = registry.get(normalized);

      // Only apply the loaded messages if the locale source is still dynamic.
      if (!latest || latest.kind !== 'dynamic') return;

      latest.messages = messages;
    })();

    loading.set(normalized, task);

    try {
      await task;
    } finally {
      loading.delete(normalized);
    }
  };

  return {
    getSnapshot() {
      return { locale, version };
    },

    getSupportedLocales(options?: { sorted?: boolean }): Locale[] {
      const locales = [...registry.keys()];

      return options?.sorted ? locales.sort() : locales;
    },

    has(key: MessageLeafKeys<M> | MessageBranchKeys<M>): boolean {
      return findValue(String(key), locale) !== undefined;
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
      bump();
    },

    subscribe(listener: () => void, options?: SubscribeOptions): Unsubscribe {
      subscribers.add(listener);

      if (options?.immediate) listener();

      return () => subscribers.delete(listener);
    },

    t(key: MessageLeafKeys<M> | MessageBranchKeys<M>, options?: TranslateOptions): string {
      const base = String(key);
      const count = options?.count;

      if (typeof count === 'number') {
        const ordinal = options?.ordinal === true;
        const form = selectPluralForm(pluralCache, locale, count, ordinal);
        const selectedKey = !ordinal && count === 0 ? `${base}.zero` : `${base}.${form}`;
        const message = findMessage(selectedKey, locale) ?? findMessage(`${base}.other`, locale);

        return message === undefined
          ? onMissing({ key: base, locale, type: 'key' })
          : interpolate(message, { ...(options?.vars ?? {}), count }, base, locale, onMissing);
      }

      const message = findMessage(base, locale);

      return message === undefined
        ? onMissing({ key: base, locale, type: 'key' })
        : interpolate(message, options?.vars, base, locale, onMissing);
    },
  };
}
