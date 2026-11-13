import { computed } from '@vielzeug/ripple';
import { describe, expect, test } from 'vitest';

import { createI18n } from '../';
import { createReactiveI18n } from '../ripple';

const enCatalog = {
  greeting: 'Hello {name}',
  inbox: { plural: { one: 'One message', other: '{count} messages' } },
  title: 'Home',
};

const frCatalog = {
  greeting: 'Bonjour {name}',
  inbox: { plural: { one: 'Un message', other: '{count} messages' } },
  title: 'Accueil',
};

type DemoCatalog = typeof enCatalog;

const setup = () =>
  createReactiveI18n(
    createI18n({
      catalogs: { en: enCatalog, fr: frCatalog } as Record<string, DemoCatalog>,
      locale: 'en',
    }),
  );

describe('createReactiveI18n', () => {
  test('translate interpolates values', () => {
    const reactive = setup();

    expect(reactive.translate('greeting', { values: { name: 'Ada' } })).toBe('Hello Ada');
  });

  test('translate selects the plural category from count', () => {
    const reactive = setup();

    expect(reactive.translate('inbox', { count: 1 })).toBe('One message');
    expect(reactive.translate('inbox', { count: 4 })).toBe('4 messages');
  });

  test('a downstream computed re-evaluates when the locale changes', async () => {
    const reactive = setup();
    const heading = computed(() => reactive.translate('title'));

    expect(heading.value).toBe('Home');

    await reactive.i18n.setLocale('fr');

    expect(heading.value).toBe('Accueil');
  });

  test('translateUnkeyed re-evaluates for runtime-assembled keys after locale changes', async () => {
    const reactive = setup();
    const dynamicKey = 'ti' + 'tle';
    const heading = computed(() => reactive.translateUnkeyed(dynamicKey));

    expect(heading.value).toBe('Home');

    await reactive.i18n.setLocale('fr');

    expect(heading.value).toBe('Accueil');
  });

  test('the locale readable tracks setLocale', async () => {
    const reactive = setup();

    expect(reactive.locale.value).toBe('en');

    await reactive.i18n.setLocale('fr');

    expect(reactive.locale.value).toBe('fr');
  });

  test('parts re-evaluates its segments when the locale changes', async () => {
    const reactive = setup();
    const segments = computed(() => reactive.parts('greeting', { values: { name: 'Ada' } }));

    expect(segments.value.map((segment) => (segment.type === 'text' ? segment.value : `[${segment.name}]`))).toEqual([
      'Hello ',
      '[name]',
    ]);

    await reactive.i18n.setLocale('fr');

    expect(segments.value.map((segment) => (segment.type === 'text' ? segment.value : `[${segment.name}]`))).toEqual([
      'Bonjour ',
      '[name]',
    ]);
  });

  test('parts passes framework-style values through untouched', () => {
    const reactive = setup();
    const node = { kind: 'vnode' };

    const segments = reactive.parts('greeting', { values: { name: node } });

    expect(segments[1]).toMatchObject({ name: 'name', type: 'value' });
    expect(segments[1]?.type === 'value' && segments[1].value).toBe(node);
  });
});
