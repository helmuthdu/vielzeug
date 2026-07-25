import { describe, expect, test } from 'vitest';

import {
  LinguaDisposedError,
  LinguaError,
  LinguaMissingLocaleError,
  LinguaNamespaceMissingError,
  createI18n,
} from '../';

describe('LinguaError', () => {
  test('errors thrown by the runtime are instanceof LinguaError', () => {
    const i18n = createI18n({ catalogs: { en: {} } });

    i18n.dispose();

    let caught: unknown;

    try {
      i18n.register('en', {});
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(LinguaError);
  });

  test('disposed errors are instanceof LinguaDisposedError', () => {
    const i18n = createI18n({ catalogs: { en: {} } });

    i18n.dispose();

    let caught: unknown;

    try {
      i18n.register('en', {});
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(LinguaError);
    expect(caught).toBeInstanceOf(LinguaDisposedError);
  });

  test('async errors are also instanceof LinguaError', async () => {
    const i18n = createI18n({ catalogs: { en: {} } });

    await expect(i18n.preload('de')).rejects.toBeInstanceOf(LinguaMissingLocaleError);
  });

  test('loadNamespace() on an unregistered namespace rejects with LinguaNamespaceMissingError', async () => {
    const i18n = createI18n({ catalogs: { en: {} } });

    await expect(i18n.loadNamespace('missing')).rejects.toBeInstanceOf(LinguaNamespaceMissingError);
    await expect(i18n.loadNamespace('missing')).rejects.toBeInstanceOf(LinguaError);
  });

  test('error subclass .name matches class name', () => {
    const i18n = createI18n({ catalogs: { en: {} } });

    i18n.dispose();

    let caught: unknown;

    try {
      i18n.subscribe(() => {});
    } catch (e) {
      caught = e;
    }

    expect((caught as LinguaError).name).toBe('LinguaDisposedError');
  });
});
