import { type CompiledCatalog, type CompiledMessage, compileCatalog } from './_catalog';
import { isDev, warn } from './_dev';
import { canonicalLocale, localeChain, pluralCategory } from './_locale';
import { renderSegments, renderText, type Template } from './_template';
import { LinguaInvalidPluralCountError, LinguaMissingKeyError, LinguaMissingValueError } from './errors';
import type {
  Catalog,
  Locale,
  MissingInfo,
  MissingStrategy,
  PartsOptions,
  PluralKey,
  PluralOptions,
  PluralPartsOptions,
  Segment,
  TextKey,
  TranslateOptions,
  TranslatorOptions,
} from './types';

export type Translator<C extends Catalog = Catalog> = {
  readonly locale: Locale;
  translate(key: TextKey<C>, options?: TranslateOptions): string;
  translate(key: PluralKey<C>, options: PluralOptions): string;
  /**
   * Translates a runtime key that is not in the catalog's typed key set. Identical to
   * `translate` at runtime: the key is looked up the same way and a missing key follows
   * the configured `missing` strategy. The one typed escape hatch for keys that arrive
   * as strings, so consumers never cast around the typed surface.
   */
  translateUnkeyed(key: string, options?: TranslateOptions | PluralOptions): string;
  /**
   * Renders a message as segments for rich content: interpolation values pass through
   * untouched (never stringified or escaped), so framework nodes survive intact.
   * Resolution — plural selection, locale fallback, and the `missing` strategy — is the
   * same code path as `translate`: joining the segments with `String()` reproduces
   * `translate` exactly. A missing key yields a single text segment holding the
   * strategy's output.
   */
  parts<V = string>(key: TextKey<C>, options?: PartsOptions<V>): readonly Segment<V>[];
  parts<V = string>(key: PluralKey<C>, options: PluralPartsOptions<V>): readonly Segment<V>[];
  /** Runtime-key escape hatch for {@link Translator.parts}, mirroring `translateUnkeyed`. */
  partsUnkeyed<V = string>(key: string, options?: PartsOptions<V> | PluralPartsOptions<V>): readonly Segment<V>[];
};

/** Loose translate signature implemented by the engine; public overloads restrict keys per catalog type. */
export type LooseTranslate = (key: string, options?: TranslateOptions | PluralOptions) => string;

/** Loose parts signature implemented by the engine; public overloads restrict keys per catalog type. */
export type LooseParts = <V>(key: string, options?: PartsOptions<V> | PluralPartsOptions<V>) => readonly Segment<V>[];

function resolveMissing(strategy: MissingStrategy | undefined, info: MissingInfo): string {
  if (strategy === 'throw') {
    throw info.name
      ? new LinguaMissingValueError(
          `Missing interpolation value "${info.name}" for key "${info.key}" in locale "${info.locale}".`,
        )
      : new LinguaMissingKeyError(`Missing translation key "${info.key}" in locale "${info.locale}".`);
  }

  if (typeof strategy === 'function') return strategy(info);

  // 'key' or undefined (default)
  if (strategy === undefined && isDev) {
    warn(
      info.name
        ? `Missing interpolation value "${info.name}" for key "${info.key}" in locale "${info.locale}".`
        : `Missing translation key "${info.key}" in locale "${info.locale}".`,
    );
  }

  return info.name ? `{${info.name}}` : info.key;
}

/** Internal engine: resolves and renders any string key against compiled catalogs for a fixed locale. */
export function createTranslateEngine(
  catalogs: ReadonlyMap<Locale, CompiledCatalog>,
  options: InternalOptions = {},
): { readonly locale: Locale; readonly translate: LooseTranslate; readonly parts: LooseParts } {
  const locale = canonicalLocale(options.locale ?? 'en');
  const fallback = (
    Array.isArray(options.fallback) ? options.fallback : options.fallback ? [options.fallback] : []
  ).map(canonicalLocale);
  const chain = localeChain(locale, fallback);
  const missing = options.missing;

  const missingKey = (key: string): string => resolveMissing(missing, { key, locale });
  const missingValue = (name: string, key: string): string => resolveMissing(missing, { key, locale, name });

  const resolve = (key: string): { readonly locale: Locale; readonly message: CompiledMessage } | undefined => {
    for (const candidate of chain) {
      const message = catalogs.get(candidate)?.get(key);

      if (message) return { locale: candidate, message };
    }

    return undefined;
  };

  const templateFor = (key: string, options: TranslateOptions | PluralOptions): Template | undefined => {
    const found = resolve(key);

    if (!found) return undefined;

    if (found.message.kind === 'text') {
      if ('count' in options) return undefined;

      return found.message.template;
    }

    if (!('count' in options) || !Number.isFinite(options.count)) {
      if ('count' in options) throw new LinguaInvalidPluralCountError('`count` must be a finite number.');

      return undefined;
    }

    const category = pluralCategory(found.locale, options.count, options.ordinal ?? false);

    return found.message.forms.get(category) ?? found.message.forms.get('other');
  };

  const translate = (key: string, options: TranslateOptions | PluralOptions = {}): string => {
    const template = templateFor(key, options);

    if (!template) return missingKey(key);

    return renderText(template, valuesFor(options), (name) => missingValue(name, key));
  };

  // Both entry points share templateFor + valuesFor + the missing callbacks, so `parts`
  // joined with String() is `translate` by construction, including the quirks consumers
  // rely on (an explicit `count` in `values` overrides the injected one).
  const parts = <V>(key: string, options: PartsOptions<V> | PluralPartsOptions<V> = {}): readonly Segment<V>[] => {
    const template = templateFor(key, options);

    if (!template) return [{ type: 'text', value: missingKey(key) }];

    return renderSegments<V>(template, valuesFor(options), (name) => missingValue(name, key));
  };

  return { locale, parts, translate };
}

const valuesFor = (options: TranslateOptions | PluralOptions): Record<string, unknown> =>
  'count' in options ? { count: options.count, ...options.values } : (options.values ?? {});

type InternalOptions = {
  readonly fallback?: Locale | readonly Locale[];
  readonly locale?: Locale;
  readonly missing?: MissingStrategy;
};

/** Creates a fixed-locale translator from one catalog. Lingua snapshots catalog messages during construction. */
export function createTranslator<C extends Catalog>(catalog: C, options?: TranslatorOptions): Translator<C> {
  const engine = createTranslateEngine(
    new Map([[canonicalLocale(options?.locale ?? 'en'), compileCatalog(catalog)]]),
    options,
  );

  return {
    locale: engine.locale,
    parts: engine.parts as Translator<C>['parts'],
    partsUnkeyed: engine.parts as Translator<C>['partsUnkeyed'],
    translate: engine.translate,
    translateUnkeyed: engine.translate,
  };
}
