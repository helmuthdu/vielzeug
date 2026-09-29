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

const setup = () =>
  createReactiveI18n(
    createI18n({
      catalogs: { en: enCatalog, fr: frCatalog } as Record<string, typeof enCatalog>,
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

  test('translateDynamic translates a runtime-assembled key', () => {
    const reactive = setup();

    expect(reactive.translateDynamic('ti' + 'tle')).toBe('Home');
  });

  test('a downstream computed re-evaluates when the locale changes', async () => {
    const reactive = setup();
    const heading = computed(() => reactive.translate('title'));

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
});
