import { type CompiledCatalog, type CompiledMessage, compileCatalog } from './_catalog';
import { isDev, warn } from './_dev';
import { canonicalLocale, localeChain, pluralCategory } from './_locale';
import { renderText, type Template } from './_template';
import { LinguaInvalidPluralCountError, LinguaMissingKeyError, LinguaMissingValueError } from './errors';
import type {
  Catalog,
  Locale,
  MissingInfo,
  MissingStrategy,
  PluralKey,
  PluralOptions,
  TextKey,
  TranslateOptions,
  TranslatorOptions,
} from './types';

export type Translator<C extends Catalog = Catalog> = {
  readonly locale: Locale;
  translate(key: TextKey<C>, options?: TranslateOptions): string;
  translate(key: PluralKey<C>, options: PluralOptions): string;
};

/** Loose translate signature implemented by the engine; public overloads restrict keys per catalog type. */
export type LooseTranslate = (key: string, options?: TranslateOptions | PluralOptions) => string;

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
): { readonly locale: Locale; readonly translate: LooseTranslate } {
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

    const values: Record<string, unknown> =
      'count' in options ? { count: options.count, ...options.values } : (options.values ?? {});

    return renderText(template, values, (name) => missingValue(name, key));
  };

  return { locale, translate };
}

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

  return { locale: engine.locale, translate: engine.translate };
}
