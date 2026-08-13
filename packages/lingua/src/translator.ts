import { type CompiledCatalog, type CompiledMessage, compileCatalog } from './_catalog';
import { canonicalLocale, localeChain, pluralCategory } from './_locale';
import { renderSegments, renderText, type Template } from './_template';
import { LinguaInvalidPluralCountError } from './errors';
import type {
  Catalog,
  Catalogs,
  CatalogTranslatorOptions,
  Locale,
  PluralKey,
  PluralOptions,
  TextKey,
  TranslateOptions,
  TranslatorOptions,
} from './types';

export type Translator<C extends Catalog = Catalog> = {
  readonly locale: Locale;
  segments<V>(key: TextKey<C>, options: TranslateOptions & { values: Record<string, V> }): Array<string | V>;
  segments<V>(key: PluralKey<C>, options: PluralOptions & { values?: Record<string, V> }): Array<string | number | V>;
  segmentsDynamic<V>(
    key: string,
    options: (TranslateOptions | PluralOptions) & { values?: Record<string, V> },
  ): Array<string | number | V>;
  translate(key: TextKey<C>, options?: TranslateOptions): string;
  translate(key: PluralKey<C>, options: PluralOptions): string;
  translateDynamic(key: string, options?: TranslateOptions | PluralOptions): string;
};

type ResolvedMessage = { readonly locale: Locale; readonly message: CompiledMessage };

export function createTranslatorFromCompiled<C extends Catalog>(
  catalogs: ReadonlyMap<Locale, CompiledCatalog>,
  options: TranslatorOptions = {},
): Translator<C> {
  const locale = canonicalLocale(options.locale ?? 'en');
  const fallback = (
    Array.isArray(options.fallback) ? options.fallback : options.fallback ? [options.fallback] : []
  ).map(canonicalLocale);
  const chain = localeChain(locale, fallback);
  const missingKey = options.onMissingKey ?? ((key: string) => key);
  const missingValue = options.onMissingValue ?? ((name: string) => `{${name}}`);

  const resolve = (key: string): ResolvedMessage | undefined => {
    for (const candidate of chain) {
      const message = catalogs.get(candidate)?.get(key);

      if (message) return { locale: candidate, message };
    }

    return undefined;
  };

  const templateFor = (
    key: string,
    options: TranslateOptions | PluralOptions,
  ): { key: string; template: Template } | undefined => {
    const found = resolve(key);

    if (!found) return undefined;

    if (found.message.kind === 'text') {
      if ('count' in options) return undefined;

      return { key, template: found.message.template };
    }

    if (!('count' in options) || !Number.isFinite(options.count)) {
      if ('count' in options) throw new LinguaInvalidPluralCountError('`count` must be a finite number.');

      return undefined;
    }

    const category =
      options.count === 0 && !options.ordinal
        ? 'zero'
        : pluralCategory(found.locale, options.count, options.ordinal ?? false);
    const template = found.message.forms.get(category) ?? found.message.forms.get('other');

    return template ? { key, template } : undefined;
  };

  const valuesFor = (options: TranslateOptions | PluralOptions): Record<string, unknown> =>
    'count' in options ? { count: options.count, ...options.values } : (options.values ?? {});

  const segmentsDynamic = <V>(
    key: string,
    options: (TranslateOptions | PluralOptions) & { values?: Record<string, V> },
  ): Array<string | number | V> => {
    const found = templateFor(key, options);

    if (!found) return [missingKey(key, locale)];

    return renderSegments(found.template, valuesFor(options) as Record<string, V | number>, (name) =>
      missingValue(name, found.key, locale),
    );
  };

  const translateDynamic = (key: string, options: TranslateOptions | PluralOptions = {}): string => {
    const found = templateFor(key, options);

    if (!found) return missingKey(key, locale);

    return renderText(found.template, valuesFor(options), (name) => missingValue(name, found.key, locale));
  };

  return {
    locale,
    segments(key: string, options: (TranslateOptions | PluralOptions) & { values?: Record<string, unknown> }) {
      return segmentsDynamic(key, options);
    },
    segmentsDynamic,
    translate(key: string, options: TranslateOptions | PluralOptions = {}) {
      return translateDynamic(key, options);
    },
    translateDynamic,
  } as Translator<C>;
}

/** Creates a fixed-locale translator from one catalog. Lingua snapshots catalog messages during construction. */
export function createCatalogTranslator<C extends Catalog>(
  catalog: C,
  options: CatalogTranslatorOptions = {},
): Translator<C> {
  const locale = canonicalLocale(options.locale ?? 'en');
  const compiled = new Map<Locale, CompiledCatalog>([[locale, compileCatalog(catalog)]]);

  return createTranslatorFromCompiled<C>(compiled, { ...options, locale });
}

export function createTranslator<C extends Catalog>(catalogs: Catalogs<C>, options?: TranslatorOptions): Translator<C> {
  const compiled = new Map<Locale, CompiledCatalog>();

  for (const [locale, catalog] of Object.entries(catalogs)) {
    compiled.set(canonicalLocale(locale), compileCatalog(catalog));
  }

  return createTranslatorFromCompiled<C>(compiled, options);
}
