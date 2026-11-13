import { describe, expect, expectTypeOf, test } from 'vitest';

import {
  type Catalog,
  createI18n,
  createTranslator,
  LinguaInvalidPluralCountError,
  LinguaMissingKeyError,
  LinguaMissingValueError,
  type Segment,
} from '../';

const catalog = {
  adjacent: '{a}{b}',
  blank: '',
  empty: 'Was {gone}',
  inbox: { plural: { one: 'One {thing}', other: '{count} {thing}s' } },
  link: 'Go to {label} now.',
  once: 'Both {x} and {x} again.',
  order: '{b} then {a}',
  place: { plural: { one: '{count}st stop', other: '{count}th stop' } },
  plain: 'Just text.',
} as const;

// Mirrors the documented contract: joining segments with String() reproduces `translate`.
const join = (segments: readonly Segment<unknown>[]): string =>
  segments.map((segment) => (segment.type === 'text' ? segment.value : String(segment.value))).join('');

describe('parts', () => {
  test('returns a single non-empty text segment for a placeholder-free message', () => {
    const translator = createTranslator(catalog, { locale: 'en' });

    expect(translator.parts('plain')).toEqual([{ type: 'text', value: 'Just text.' }]);
  });

  test('returns no segments for an empty message, matching the empty string from translate', () => {
    const translator = createTranslator(catalog, { locale: 'en' });

    expect(translator.parts('blank')).toEqual([]);
    expect(translator.translate('blank')).toBe('');
  });

  test('applies ordinal plural categories', () => {
    const translator = createTranslator(catalog, { locale: 'en' });

    expect(join(translator.parts('place', { count: 1, ordinal: true }))).toBe('1st stop');
    expect(join(translator.parts('place', { count: 4, ordinal: true }))).toBe('4th stop');
  });

  test('rejects a non-finite plural count like translate', () => {
    const translator = createTranslator(catalog, { locale: 'en' });

    expect(() => translator.parts('inbox', { count: Number.NaN })).toThrow(LinguaInvalidPluralCountError);
  });

  test('returns text and value segments in render order', () => {
    const translator = createTranslator(catalog, { locale: 'en' });

    expect(translator.parts('link', { values: { label: 'Sync' } })).toEqual([
      { type: 'text', value: 'Go to ' },
      { name: 'label', type: 'value', value: 'Sync' },
      { type: 'text', value: ' now.' },
    ]);
  });

  test('passes non-string values through with identity preserved', () => {
    const translator = createTranslator<{ link: string }>(catalog, { locale: 'en' });
    const node = { render: 'framework-node' };

    const [, segment] = translator.parts('link', { values: { label: node } });

    expect(segment).toMatchObject({ name: 'label', type: 'value' });
    expect(segment.type === 'value' && segment.value).toBe(node);
  });

  test('renders a value used twice twice', () => {
    const translator = createTranslator(catalog, { locale: 'en' });

    const segments = translator.parts('once', { values: { x: 'X' } });

    expect(segments.filter((segment) => segment.type === 'value')).toHaveLength(2);
    expect(join(segments)).toBe('Both X and X again.');
  });

  test('emits adjacent value segments with no empty text segment between', () => {
    const translator = createTranslator(catalog, { locale: 'en' });

    expect(translator.parts('adjacent', { values: { a: 'A', b: 'B' } })).toEqual([
      { name: 'a', type: 'value', value: 'A' },
      { name: 'b', type: 'value', value: 'B' },
    ]);
  });

  test('ignores values the message does not reference', () => {
    const translator = createTranslator(catalog, { locale: 'en' });

    expect(join(translator.parts('link', { values: { extra: 'ignored', label: 'Sync' } }))).toBe('Go to Sync now.');
  });

  test('routes a missing value through the key strategy as a text segment', () => {
    const translator = createTranslator(catalog, { locale: 'en', missing: 'key' });

    expect(translator.parts('link')).toEqual([
      { type: 'text', value: 'Go to ' },
      { type: 'text', value: '{label}' },
      { type: 'text', value: ' now.' },
    ]);
  });

  test('routes a missing value through a handler strategy', () => {
    const translator = createTranslator(catalog, {
      locale: 'en',
      missing: (info) => (info.name ? `[${info.name}]` : info.key),
    });

    expect(translator.parts('link')).toEqual([
      { type: 'text', value: 'Go to ' },
      { type: 'text', value: '[label]' },
      { type: 'text', value: ' now.' },
    ]);
  });

  test('throws on a missing value under the throw strategy', () => {
    const translator = createTranslator(catalog, { locale: 'en', missing: 'throw' });

    expect(() => translator.parts('link')).toThrow(LinguaMissingValueError);
  });

  test('throws on a missing key under the throw strategy', () => {
    const translator = createTranslator(catalog, { locale: 'en', missing: 'throw' });

    expect(() => translator.parts('no.such.key' as never)).toThrow(LinguaMissingKeyError);
  });

  test('treats null and undefined values as missing', () => {
    const nullish = createTranslator<{ empty: string; link: string }>(
      { empty: 'Was {gone}', link: 'Go to {label} now.' },
      { locale: 'en', missing: 'key' },
    );

    expect(nullish.parts('empty', { values: { gone: null } })).toEqual([
      { type: 'text', value: 'Was ' },
      { type: 'text', value: '{gone}' },
    ]);
    expect(nullish.parts('link', { values: { label: undefined } })).toEqual([
      { type: 'text', value: 'Go to ' },
      { type: 'text', value: '{label}' },
      { type: 'text', value: ' now.' },
    ]);
  });

  test('keeps an empty-string value as a value segment, not a missing one', () => {
    const translator = createTranslator<{ link: string }>(catalog, { locale: 'en' });

    expect(translator.parts('link', { values: { label: '' } })).toEqual([
      { type: 'text', value: 'Go to ' },
      { name: 'label', type: 'value', value: '' },
      { type: 'text', value: ' now.' },
    ]);
  });

  test('selects plural forms and interpolates count into the chosen form', () => {
    const translator = createTranslator(catalog, { locale: 'en' });

    expect(translator.parts('inbox', { count: 1, values: { thing: 'message' } })).toEqual([
      { type: 'text', value: 'One ' },
      { name: 'thing', type: 'value', value: 'message' },
    ]);
    expect(join(translator.parts('inbox', { count: 4, values: { thing: 'message' } }))).toBe('4 messages');
  });

  test('lets an explicit count value override the injected count', () => {
    const translator = createTranslator(catalog, { locale: 'en' });

    expect(join(translator.parts('inbox', { count: 4, values: { count: 'four', thing: 'message' } }))).toBe(
      'four messages',
    );
  });

  test('follows the missing-key path when count meets a text key', () => {
    const translator = createTranslator(catalog, { locale: 'en', missing: 'key' });

    expect(translator.parts('plain', { count: 1 } as never)).toEqual([{ type: 'text', value: 'plain' }]);
  });

  test('translates untyped runtime keys through partsUnkeyed', () => {
    const translator = createTranslator(catalog, { locale: 'en' });

    expect(join(translator.partsUnkeyed('link', { values: { label: 'Sync' } }))).toBe('Go to Sync now.');
    expect(translator.partsUnkeyed('no.such.key')).toEqual([{ type: 'text', value: 'no.such.key' }]);
  });

  test('keeps interpolation semantics identical to translate across inputs', () => {
    const translator = createTranslator(catalog, { locale: 'en', missing: 'key' });

    const cases: readonly (readonly [string, never?])[] = [
      ['plain'],
      ['link'],
      ['link', { values: { label: 'Sync' } } as never],
      ['link', { values: { label: 42 } } as never],
      ['link', { values: { label: '' } } as never],
      ['once', { values: { x: 'X' } } as never],
      ['adjacent', { values: { a: 1, b: true } } as never],
      ['order', { values: { a: {}, b: [1, 2] } } as never],
      ['empty', { values: { gone: null } } as never],
      ['inbox', { count: 1 } as never],
      ['inbox', { count: 0, values: { thing: 'box' } } as never],
      ['no.such.key' as never],
    ];

    for (const [key, options] of cases) {
      const opts = options as { values?: Record<string, unknown>; count?: number } | undefined;
      const translated =
        opts === undefined ? translator.translate(key as never) : translator.translate(key as never, opts as never);
      const segmented = join(
        opts === undefined ? translator.parts(key as never) : translator.parts(key as never, opts as never),
      );

      expect(segmented, `parts/translate divergence for ${key}`).toBe(translated);
    }
  });

  test('defaults the segment value type to string', () => {
    const translator = createTranslator(catalog, { locale: 'en' });

    expectTypeOf(translator.parts('plain')).toEqualTypeOf<readonly Segment<string>[]>();
  });
});

describe('parts with locale state', () => {
  const en = { link: 'Go to {label} now.' };
  const de = { link: '{label} jetzt öffnen.' };

  test('renders segments for the committed locale after setLocale', async () => {
    const i18n = createI18n({ catalogs: { de, en }, locale: 'en' });

    expect(join(i18n.parts('link', { values: { label: 'Sync' } }))).toBe('Go to Sync now.');

    await i18n.setLocale('de');

    expect(i18n.parts('link', { values: { label: 'Sync' } })).toEqual([
      { name: 'label', type: 'value', value: 'Sync' },
      { type: 'text', value: ' jetzt öffnen.' },
    ]);
  });

  test('falls back through the locale chain like translate', () => {
    const i18n = createI18n<Catalog>({ catalogs: { de: {}, en }, fallback: 'en', locale: 'de' });

    expect(join(i18n.partsUnkeyed('link', { values: { label: 'Sync' } }))).toBe('Go to Sync now.');
  });

  test('renders after lazily loaded catalogs arrive', async () => {
    const i18n = createI18n({
      loadCatalog: async (locale) => (locale === 'en' ? en : de),
      locale: 'en',
    });
    await i18n.load();

    expect(join(i18n.parts('link', { values: { label: 'Sync' } }))).toBe('Go to Sync now.');

    await i18n.setLocale('de');

    expect(join(i18n.parts('link', { values: { label: 'Sync' } }))).toBe('Sync jetzt öffnen.');
  });
});
