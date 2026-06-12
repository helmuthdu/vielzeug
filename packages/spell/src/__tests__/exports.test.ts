import type { DeepPartial, Messages } from '../index';

import * as spell from '../index';

describe('format validators present in public API', () => {
  const formatValidators = [
    'isBase64',
    'isBase64url',
    'isCuid',
    'isCuid2',
    'isDuration',
    'isEmail',
    'isEmoji',
    'isHex',
    'isHexColor',
    'isIp',
    'isIsoDate',
    'isIsoDateTime',
    'isJwt',
    'isNanoid',
    'isNumeric',
    'isSemver',
    'isSlug',
    'isTime',
    'isUlid',
    'isUrl',
    'isUuid',
  ];

  for (const name of formatValidators) {
    it(`exports ${name} as a function`, () => {
      expect(typeof (spell as Record<string, unknown>)[name]).toBe('function');
    });
  }
});

describe('DeepPartial<Messages> export', () => {
  it('DeepPartial is importable and usable as a Messages override type', () => {
    const override: DeepPartial<Messages> = { string: { type: () => 'custom string type error' } };

    expect(typeof override).toBe('object');
  });
});

describe('public api surface', () => {
  it('does not re-export isPlainObject from the package entrypoint', () => {
    expect('isPlainObject' in spell).toBe(false);
  });

  it('does not export resolveMessage (internal utility)', () => {
    expect('resolveMessage' in spell).toBe(false);
  });

  it('does not export standalone sXxx factory functions', () => {
    const standalones = Object.keys(spell).filter((k) => /^s[A-Z]/.test(k));

    expect(standalones).toEqual([]);
  });

  it('exports the s namespace with all factory methods', () => {
    const methods = [
      'and',
      'any',
      'array',
      'bigint',
      'boolean',
      'coerce',
      'date',
      'enum',
      'instanceof',
      'intersect',
      'lazy',
      'literal',
      'map',
      'never',
      'null',
      'number',
      'object',
      'or',
      'record',
      'set',
      'string',
      'tuple',
      'undefined',
      'union',
      'unknown',
      'variant',
    ];

    for (const m of methods) {
      expect(spell.s).toHaveProperty(m);
    }
  });
});
