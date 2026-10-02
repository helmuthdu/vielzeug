import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { de } from '../app/locales/de';
import { en } from '../app/locales/en';
import { PROMOS } from './promos';

/**
 * The promo registry contract: every corner card opens a secure page, ships its
 * art from /public, declares honest intrinsic sizes, and names itself in both
 * locale catalogs: a typo'd key would render as its own path in the UI.
 */

function catalogValue(catalog: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], catalog);
}

describe('promo registry', () => {
  it('uses stable, unique ids', () => {
    const ids = PROMOS.map((promo) => promo.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[a-z0-9-]+$/.test(id))).toBe(true);
  });

  it('links to https pages', () => {
    for (const promo of PROMOS) {
      const url = new URL(promo.url);
      expect(url.protocol, promo.id).toBe('https:');
    }
  });

  it('ships its art from /public', () => {
    const publicDir = path.resolve(import.meta.dirname, '../../public');
    for (const promo of PROMOS) {
      const file = path.join(publicDir, promo.image.replace(/^\//, ''));
      expect(fs.existsSync(file), `${promo.id}: ${promo.image}`).toBe(true);
    }
  });

  it('declares positive intrinsic sizes', () => {
    for (const promo of PROMOS) {
      expect(promo.width, promo.id).toBeGreaterThan(0);
      expect(promo.height, promo.id).toBeGreaterThan(0);
    }
  });

  it('resolves every title key in both catalogs', () => {
    for (const promo of PROMOS) {
      for (const [name, catalog] of [
        ['en', en],
        ['de', de],
      ] as const) {
        const value = catalogValue(catalog, promo.titleKey);
        expect(value, `${promo.titleKey} missing from ${name}`).toBeTypeOf('string');
      }
    }
  });
});
