import { readFileSync } from 'node:fs';

import { createIllusion } from '../factory';
import { de } from '../locales/de';
import { en } from '../locales/en';

const NAMESPACES = ['person', 'internet', 'commerce', 'date', 'finance', 'location', 'lorem', 'system'] as const;

describe('createIllusion', () => {
  it('returns an object with all 8 category namespaces', () => {
    const illusionist = createIllusion({ locale: en, seed: 12345 });

    for (const ns of NAMESPACES) {
      expect(illusionist[ns]).toBeDefined();
      expect(typeof illusionist[ns]).toBe('object');
    }
  });

  it('reflects the seed and locale options', () => {
    const illusionist = createIllusion({ locale: de, seed: 'abc' });

    expect(illusionist.seed).toBe('abc');
    expect(illusionist.locale).toBe(de);
  });

  it('uses the selected locale data', () => {
    const english = createIllusion({ locale: en, seed: 12345 });
    const german = createIllusion({ locale: de, seed: 12345 });

    expect([...en.person.firstNameMale, ...en.person.firstNameFemale]).toContain(english.person.firstName());
    expect([...de.person.firstNameMale, ...de.person.firstNameFemale]).toContain(german.person.firstName());
    expect(en.location.cities).toContain(english.location.city());
    expect(de.location.cities).toContain(german.location.city());
  });

  it('sets disposed to true after dispose()', () => {
    const illusionist = createIllusion({ locale: en, seed: 1 });

    expect(illusionist.disposed).toBe(false);
    illusionist.dispose();
    expect(illusionist.disposed).toBe(true);
  });

  it('aborts the disposalSignal on dispose()', () => {
    const illusionist = createIllusion({ locale: en, seed: 1 });

    expect(illusionist.disposalSignal.aborted).toBe(false);
    illusionist.dispose();
    expect(illusionist.disposalSignal.aborted).toBe(true);
  });

  it('supports [Symbol.dispose]()', () => {
    const illusionist = createIllusion({ locale: en, seed: 1 });

    expect(illusionist.disposed).toBe(false);
    illusionist[Symbol.dispose]();
    expect(illusionist.disposed).toBe(true);
    expect(illusionist.disposalSignal.aborted).toBe(true);
  });

  it('is deterministic: same seed produces the same fullName', () => {
    const a = createIllusion({ locale: en, seed: 12345 });
    const b = createIllusion({ locale: en, seed: 12345 });

    expect(a.person.fullName()).toBe(b.person.fullName());
  });

  it('produces different output for different seeds (with high probability)', () => {
    const a = createIllusion({ locale: en, seed: 1 });
    const b = createIllusion({ locale: en, seed: 2 });

    expect(a.person.fullName()).not.toBe(b.person.fullName());
  });

  it('keeps locale datasets out of core entries', () => {
    for (const path of ['../factory.ts', '../person/person.ts', '../location/location.ts']) {
      const source = readFileSync(new URL(path, import.meta.url), 'utf8');

      expect(source).not.toMatch(/^import .*['"].*(?:data-en|data-de|locales\/(?:en|de))['"];?$/m);
    }
  });
});
