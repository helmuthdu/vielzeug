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
  | { flat: Map<string, string>; kind: 'static' };

// Accumulates entries into `result` (defaults to a new Map). Passing the map
// down avoids allocating an intermediate Map per nesting level.
function flatten(messages: Messages, result = new Map<string, string>(), prefix?: string): Map<string, string> {
  for (const [key, value] of Object.entries(messages)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      result.set(fullKey, value);
    } else {
      flatten(value as Messages, result, fullKey);
    }
  }

  return result;
}

function makeRecord<M extends Messages>(source: LocaleSource<M>): LocaleRecord<M> {
  if (typeof source === 'function') {
    return { kind: 'dynamic', loader: source as Loader<M> };
  }

  return { flat: flatten(source as M), kind: 'static' };
}

const INTERPOLATION_PATTERN = /\{([\p{ID_Continue}-]+)\}/gu;

const CARDINAL_FALLBACK: PluralRuleSelector = { select: (n) => (n === 1 ? 'one' : 'other') };

function canon(locale: string): string {
  let canonical: string | undefined;

  try {
    [canonical] = Intl.getCanonicalLocales(locale);
  } catch {
    // Invalid BCP 47 tag — canonical stays undefined, guard below throws.
  }

  if (!canonical) throw new Error(`[lingua/E004] Invalid BCP 47 locale tag: "${locale}".`);

  return canonical;
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
  // Populated during catalog initialization and register() calls — not by merge().
  // Used for reference-equality dedup: register() with the same source object is a no-op.
  const registrationSources = new Map<Locale, LocaleSource<M>>();
  const subscribers = new Set<(snapshot: I18nSnapshot) => void>();
  const pluralCache: PluralCaches = new Map();
  const onMissing =
    cfg.onMissing ??
    ((info: MissingInfo) => {
      if (info.type === 'key') return info.key;

      return `{${info.varName}}`;
    });
  const onSubscriberError =
    cfg.onSubscriberError ?? ((error: unknown) => console.error('[lingua] subscriber error', error));

  let version = 0;
  let snapshot: I18nSnapshot = { locale, version };
  let { chain: activeChain, set: activeChainSet } = buildLocaleChain(locale, fallback);
  let switchId = 0;
  let _fmt: Formatter | undefined;

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
    for (const candidate of activeChain) {
      const entry = registry.get(candidate);

      if (entry?.kind !== 'static') continue;

      const value = entry.flat.get(key);

      if (value !== undefined) return value;
    }

    return undefined;
  };

  const register = (loc: Locale, source: LocaleSource<M>): void => {
    const normalized = canon(loc);

    // Skip if the same source reference is already registered — avoids rebuilding
    // the flat map and notifying subscribers when nothing has actually changed.
    if (registrationSources.get(normalized) === source) return;

    registrationSources.set(normalized, source);
    registry.set(normalized, makeRecord(source));

    if (activeChainSet.has(normalized)) bump();
  };

  if (cfg.catalogs) {
    for (const [loc, source] of Object.entries(cfg.catalogs)) {
      const normalized = canon(loc);
      const typedSource = source as LocaleSource<M>;

      registrationSources.set(normalized, typedSource);
      registry.set(normalized, makeRecord(typedSource));
    }
  }

  const preload = (loc: Locale): Promise<void> => {
    const normalized = canon(loc);
    const entry = registry.get(normalized);

    if (!entry) return Promise.reject(new Error(`[lingua/E001] Missing locale source for "${normalized}".`));

    if (entry.kind === 'static') return Promise.resolve();

    if (entry.loadingTask) return entry.loadingTask;

    // Assign the task synchronously so concurrent calls deduplicate against this entry.
    entry.loadingTask = entry.loader().then(
      (messages) => {
        // Discard if the entry was replaced by a concurrent register() call.
        if (registry.get(normalized) !== entry) return;

        registry.set(normalized, { flat: flatten(messages), kind: 'static' });

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

  const merge = async (loc: Locale, source: LocaleSource<M>): Promise<void> => {
    const normalized = canon(loc);

    // Wait for any in-flight dynamic load to complete before merging, so base
    // catalog keys are preserved rather than overwritten by the merge source.
    const existing = registry.get(normalized);

    if (existing?.kind === 'dynamic') {
      await preload(normalized);
    }

    // Load the merge source (static or async loader).
    const mergeMessages = typeof source === 'function' ? await (source as Loader<M>)() : (source as M);
    const mergeFlat = flatten(mergeMessages);

    // Apply merged keys on top of the current catalog, or create a new one.
    const current = registry.get(normalized);

    if (current?.kind === 'static') {
      for (const [key, value] of mergeFlat) {
        current.flat.set(key, value);
      }
    } else {
      registry.set(normalized, { flat: mergeFlat, kind: 'static' });
    }

    if (activeChainSet.has(normalized)) bump();
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
      throw new TypeError('[lingua/E002] `count` must be a finite number.');
    }

    if (options?.vars && Object.hasOwn(options.vars, 'count')) {
      throw new Error('[lingua/E003] `tp` does not allow `vars.count`; `count` is injected automatically.');
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

    merge,

    preload,

    register,

    scope(prefix: MessageBranchKeys<M> | AnyKey): ScopedI18n {
      const pre = String(prefix);

      return {
        has: (key) => findMessage(`${pre}.${key}`) !== undefined,
        t: (key, vars?) => translate(`${pre}.${key}`, vars),
        tp: (key, count, options?) => translatePlural(`${pre}.${key}`, count, options),
      };
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
