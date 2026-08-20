import { de } from '../locales/de';
import { en } from '../locales/en';
import { firstName, fullName, gender, jobTitle, lastName, prefix, suffix } from '../person/person';
import { createSeed } from '../seed/create-seed';
import type { IllusionistContext, IllusionistLocale } from '../types';

function ctx(seed = 12345, locale: IllusionistLocale = en): IllusionistContext {
  return { locale, source: createSeed(seed) };
}

describe('person', () => {
  it('firstName returns a non-empty string from the correct locale pool', () => {
    const c = ctx(12345, en);
    const name = firstName(c);
    const pool = [...en.person.firstNameMale, ...en.person.firstNameFemale];

    expect(name.length).toBeGreaterThan(0);
    expect(pool).toContain(name);
  });

  it('lastName returns a non-empty string', () => {
    const name = lastName(ctx());

    expect(name.length).toBeGreaterThan(0);
  });

  it('fullName contains a space', () => {
    const name = fullName(ctx());

    expect(name).toContain(' ');
  });

  it('gender returns a known value', () => {
    const value = gender(ctx(1, en));

    expect(en.person.gender).toContain(value);
  });

  it('prefix returns a known value', () => {
    const value = prefix(ctx(1, en));

    expect(en.person.prefix).toContain(value);
  });

  it('suffix returns a known value (or empty string for "de")', () => {
    const enSuffix = suffix(ctx(1, en));
    const deSuffix = suffix(ctx(1, de));

    if (enSuffix !== '') {
      expect(en.person.suffix).toContain(enSuffix);
    }
    expect(deSuffix).toBe('');
  });

  it('jobTitle contains a space', () => {
    const title = jobTitle(ctx());

    expect(title).toContain(' ');
  });

  it('locale "de" uses German names', () => {
    const c = ctx(12345, de);
    const name = firstName(c);
    const pool = [...de.person.firstNameMale, ...de.person.firstNameFemale];

    expect(pool).toContain(name);
  });

  it('is deterministic with the same seed', () => {
    expect(firstName(ctx(12345, en))).toBe(firstName(ctx(12345, en)));
    expect(fullName(ctx(12345, en))).toBe(fullName(ctx(12345, en)));
  });
});
