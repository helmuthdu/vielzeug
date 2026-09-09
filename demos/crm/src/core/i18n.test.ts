import { afterEach, describe, expect, it } from 'vitest';
import { setLocale, t } from './i18n';

afterEach(() => setLocale('en'));

describe('CRM translations', () => {
  it('switches translated UI text with the active locale', async () => {
    expect(t('nav.overview')).toBe('Overview');

    await setLocale('de');

    expect(t('nav.overview')).toBe('Übersicht');
    expect(t('action.newOpportunity')).toBe('Neue Verkaufschance');
  });

  it('interpolates translated values', async () => {
    await setLocale('de');

    expect(t('commandPalette.goTo', { name: t('nav.companies') })).toBe('Gehe zu Unternehmen');
  });
});
