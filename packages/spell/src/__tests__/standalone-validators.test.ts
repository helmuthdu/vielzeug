import { describe, expect, it } from 'vitest';

import {
  isBase64,
  isBase64url,
  isCuid,
  isCuid2,
  isDuration,
  isEmail,
  isEmoji,
  isHex,
  isHexColor,
  isIp,
  isIsoDate,
  isIsoDateTime,
  isJwt,
  isNanoid,
  isNumeric,
  isSemver,
  isSlug,
  isTime,
  isUlid,
  isUrl,
  isUuid,
} from '../formats';
import {
  hasMaxLength,
  hasMinLength,
  isArray,
  isBoolean,
  isDate,
  isInRange,
  isInteger,
  isMultipleOf,
  isNegative,
  isNonNegative,
  isNullOrUndefined,
  isNumber,
  isPositive,
  isString,
} from '../validators';

// ---------------------------------------------------------------------------
// validators.ts — type guards and range helpers
// ---------------------------------------------------------------------------

describe('isString', () => {
  it('returns true for strings', () => {
    expect(isString('')).toBe(true);
    expect(isString('hello')).toBe(true);
  });

  it('returns false for non-strings', () => {
    expect(isString(42)).toBe(false);
    expect(isString(null)).toBe(false);
    expect(isString(undefined)).toBe(false);
  });
});

describe('isNumber', () => {
  it('returns true for finite numbers', () => {
    expect(isNumber(0)).toBe(true);
    expect(isNumber(-1.5)).toBe(true);
  });

  it('returns false for NaN and non-numbers', () => {
    expect(isNumber(NaN)).toBe(false);
    expect(isNumber('1')).toBe(false);
    expect(isNumber(null)).toBe(false);
  });

  it('returns true for Infinity (not excluded by the type guard)', () => {
    expect(isNumber(Infinity)).toBe(true);
    expect(isNumber(-Infinity)).toBe(true);
  });
});

describe('isBoolean', () => {
  it('returns true for boolean primitives only', () => {
    expect(isBoolean(true)).toBe(true);
    expect(isBoolean(false)).toBe(true);
    expect(isBoolean(1)).toBe(false);
    expect(isBoolean('true')).toBe(false);
  });
});

describe('isArray', () => {
  it('returns true for arrays', () => {
    expect(isArray([])).toBe(true);
    expect(isArray([1, 2, 3])).toBe(true);
  });

  it('returns false for non-arrays', () => {
    expect(isArray({})).toBe(false);
    expect(isArray('[]')).toBe(false);
  });
});

describe('isDate', () => {
  it('returns true for valid Date instances', () => {
    expect(isDate(new Date())).toBe(true);
  });

  it('returns false for invalid dates and non-Date values', () => {
    expect(isDate(new Date('invalid'))).toBe(false);
    expect(isDate('2024-01-01')).toBe(false);
    expect(isDate(null)).toBe(false);
  });
});

describe('isNullOrUndefined', () => {
  it('returns true for null and undefined only', () => {
    expect(isNullOrUndefined(null)).toBe(true);
    expect(isNullOrUndefined(undefined)).toBe(true);
    expect(isNullOrUndefined(0)).toBe(false);
    expect(isNullOrUndefined('')).toBe(false);
  });
});

describe('isInteger', () => {
  it('returns true for integer-valued numbers', () => {
    expect(isInteger(0)).toBe(true);
    expect(isInteger(42)).toBe(true);
    expect(isInteger(-1)).toBe(true);
  });

  it('returns false for non-integer numbers', () => {
    expect(isInteger(1.5)).toBe(false);
    expect(isInteger(NaN)).toBe(false);
  });
});

describe('isPositive', () => {
  it('returns true only for values strictly > 0', () => {
    expect(isPositive(1)).toBe(true);
    expect(isPositive(0.001)).toBe(true);
    expect(isPositive(0)).toBe(false);
    expect(isPositive(-1)).toBe(false);
  });
});

describe('isNegative', () => {
  it('returns true only for values strictly < 0', () => {
    expect(isNegative(-1)).toBe(true);
    expect(isNegative(0)).toBe(false);
    expect(isNegative(1)).toBe(false);
  });
});

describe('isNonNegative', () => {
  it('returns true for zero and positive values', () => {
    expect(isNonNegative(0)).toBe(true);
    expect(isNonNegative(1)).toBe(true);
    expect(isNonNegative(-0.001)).toBe(false);
  });
});

describe('isMultipleOf', () => {
  it('returns true when value is a multiple of divisor', () => {
    expect(isMultipleOf(10, 5)).toBe(true);
    expect(isMultipleOf(9, 3)).toBe(true);
  });

  it('returns false when value is not a multiple', () => {
    expect(isMultipleOf(7, 3)).toBe(false);
    expect(isMultipleOf(1, 2)).toBe(false);
  });
});

describe('isInRange', () => {
  it('returns true when value is within inclusive bounds', () => {
    expect(isInRange(5, 1, 10)).toBe(true);
    expect(isInRange(1, 1, 10)).toBe(true);
    expect(isInRange(10, 1, 10)).toBe(true);
  });

  it('returns false outside bounds', () => {
    expect(isInRange(0, 1, 10)).toBe(false);
    expect(isInRange(11, 1, 10)).toBe(false);
  });
});

describe('hasMinLength', () => {
  it('returns true when string length >= min', () => {
    expect(hasMinLength('hello', 3)).toBe(true);
    expect(hasMinLength('hi', 2)).toBe(true);
  });

  it('returns false when string is too short', () => {
    expect(hasMinLength('a', 2)).toBe(false);
  });

  it('works with arrays', () => {
    expect(hasMinLength([1, 2, 3], 2)).toBe(true);
    expect(hasMinLength([], 1)).toBe(false);
  });
});

describe('hasMaxLength', () => {
  it('returns true when string length <= max', () => {
    expect(hasMaxLength('hi', 5)).toBe(true);
    expect(hasMaxLength('hello', 5)).toBe(true);
  });

  it('returns false when string is too long', () => {
    expect(hasMaxLength('toolong', 5)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formats.ts — standalone format validators
// ---------------------------------------------------------------------------

describe('isEmail', () => {
  it('accepts valid email addresses', () => {
    expect(isEmail('user@example.com')).toBe(true);
    expect(isEmail('user+tag@sub.domain.io')).toBe(true);
  });

  it('rejects invalid email addresses', () => {
    expect(isEmail('notanemail')).toBe(false);
    expect(isEmail('@nodomain')).toBe(false);
    expect(isEmail('')).toBe(false);
  });
});

describe('isUrl', () => {
  it('accepts valid URLs', () => {
    expect(isUrl('https://example.com')).toBe(true);
    expect(isUrl('http://localhost:3000/path?q=1')).toBe(true);
  });

  it('rejects invalid URLs', () => {
    expect(isUrl('not a url')).toBe(false);
    expect(isUrl('')).toBe(false);
  });
});

describe('isUuid', () => {
  it('accepts valid UUIDs', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });

  it('rejects invalid UUIDs', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('')).toBe(false);
  });
});

describe('isIsoDate', () => {
  it('accepts ISO 8601 dates', () => {
    expect(isIsoDate('2024-01-15')).toBe(true);
  });

  it('rejects non-ISO dates', () => {
    expect(isIsoDate('01/15/2024')).toBe(false);
    expect(isIsoDate('2024-13-01')).toBe(false);
  });
});

describe('isIsoDateTime', () => {
  it('accepts ISO 8601 datetimes', () => {
    expect(isIsoDateTime('2024-01-15T10:30:00Z')).toBe(true);
    expect(isIsoDateTime('2024-01-15T10:30:00+02:00')).toBe(true);
  });

  it('accepts datetime without seconds (HH:MM only)', () => {
    expect(isIsoDateTime('2024-01-15T10:30Z')).toBe(true);
    expect(isIsoDateTime('2024-01-15T10:30+05:30')).toBe(true);
  });

  it('accepts datetime with fractional seconds', () => {
    expect(isIsoDateTime('2024-01-15T10:30:00.123Z')).toBe(true);
    expect(isIsoDateTime('2024-01-15T10:30:00.999999Z')).toBe(true);
    expect(isIsoDateTime('2024-01-15T10:30:00.1+01:00')).toBe(true);
  });

  it('accepts datetime without timezone offset', () => {
    expect(isIsoDateTime('2024-01-15T10:30:00')).toBe(true);
    expect(isIsoDateTime('2024-01-15T10:30:00.5')).toBe(true);
  });

  it('rejects invalid datetimes', () => {
    expect(isIsoDateTime('2024-01-15')).toBe(false);
    expect(isIsoDateTime('not-a-date')).toBe(false);
    expect(isIsoDateTime('2024-01-15T25:00:00Z')).toBe(false);
    expect(isIsoDateTime('2024-01-15T10:60:00Z')).toBe(false);
  });
});

describe('isNanoid', () => {
  it('accepts default-length NanoIDs (21 chars)', () => {
    expect(isNanoid('V1StGXR8_Z5jdHi6B-myT')).toBe(true);
  });

  it('rejects strings with invalid characters', () => {
    expect(isNanoid('V1StGXR8_Z5jdHi6B+myT')).toBe(false);
  });

  it('accepts custom-length NanoIDs', () => {
    expect(isNanoid('V1StGXR8_Z', 10)).toBe(true);
    expect(isNanoid('V1StGXR8_Z5jdHi6B-myT', 10)).toBe(false);
  });
});

describe('isUlid', () => {
  it('accepts valid ULIDs', () => {
    expect(isUlid('01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(true);
  });

  it('rejects invalid ULIDs', () => {
    expect(isUlid('not-a-ulid')).toBe(false);
  });
});

describe('isCuid', () => {
  it('accepts strings starting with c and alphanumeric', () => {
    expect(isCuid('c1234567890')).toBe(true);
  });

  it('rejects non-cuid strings', () => {
    expect(isCuid('notcuid')).toBe(false);
    expect(isCuid('C1234567890')).toBe(false);
  });
});

describe('isCuid2', () => {
  it('accepts 24-char lowercase alphanumeric starting with a letter', () => {
    expect(isCuid2('a23456789012345678901234')).toBe(true);
  });

  it('rejects too-short or non-matching strings', () => {
    expect(isCuid2('too-short')).toBe(false);
  });
});

describe('isBase64', () => {
  it('accepts valid base64 strings', () => {
    expect(isBase64('SGVsbG8=')).toBe(true);
    expect(isBase64('dGVzdA==')).toBe(true);
  });

  it('rejects non-base64 strings and empty string', () => {
    expect(isBase64('not!base64$$')).toBe(false);
    expect(isBase64('')).toBe(false);
  });
});

describe('isBase64url', () => {
  it('accepts valid base64url strings', () => {
    expect(isBase64url('SGVsbG8')).toBe(true);
  });

  it('rejects standard base64 with + and /', () => {
    expect(isBase64url('SGVs+G8=')).toBe(false);
  });
});

describe('isHex', () => {
  it('accepts valid hex strings', () => {
    expect(isHex('deadBEEF')).toBe(true);
    expect(isHex('0123456789abcdef')).toBe(true);
  });

  it('rejects non-hex strings and empty string', () => {
    expect(isHex('nothex')).toBe(false);
    expect(isHex('')).toBe(false);
  });
});

describe('isHexColor', () => {
  it('accepts 3 and 6 digit hex colors', () => {
    expect(isHexColor('#abc')).toBe(true);
    expect(isHexColor('#aabbcc')).toBe(true);
  });

  it('rejects colors without # or invalid chars', () => {
    expect(isHexColor('aabbcc')).toBe(false);
    expect(isHexColor('#gg0000')).toBe(false);
  });
});

describe('isIp', () => {
  it('accepts valid IPv4 and IPv6 addresses', () => {
    expect(isIp('192.168.1.1')).toBe(true);
    expect(isIp('::1')).toBe(true);
  });

  it('rejects invalid IP addresses', () => {
    expect(isIp('999.999.999.999')).toBe(false);
    expect(isIp('not-an-ip')).toBe(false);
  });
});

describe('isJwt', () => {
  it('accepts three-part dot-delimited strings', () => {
    expect(isJwt('aaa.bbb.ccc')).toBe(true);
  });

  it('rejects two-part or non-string values', () => {
    expect(isJwt('aaa.bbb')).toBe(false);
  });
});

describe('isTime', () => {
  it('accepts HH:MM and HH:MM:SS formats', () => {
    expect(isTime('09:30')).toBe(true);
    expect(isTime('23:59:59')).toBe(true);
  });

  it('rejects invalid times', () => {
    expect(isTime('25:00')).toBe(false);
    expect(isTime('9:30')).toBe(false);
  });
});

describe('isDuration', () => {
  it('accepts ISO 8601 duration strings', () => {
    expect(isDuration('PT2H30M')).toBe(true);
    expect(isDuration('P1Y2M3DT4H5M6S')).toBe(true);
  });

  it('rejects non-duration strings', () => {
    expect(isDuration('not-duration')).toBe(false);
    expect(isDuration('')).toBe(false);
  });
});

describe('isSemver', () => {
  it('accepts valid semantic version strings', () => {
    expect(isSemver('1.0.0')).toBe(true);
    expect(isSemver('1.0.0-alpha.1')).toBe(true);
    expect(isSemver('2.0.0+build.1')).toBe(true);
  });

  it('rejects malformed versions', () => {
    expect(isSemver('01.0.0')).toBe(false);
    expect(isSemver('1.0')).toBe(false);
  });
});

describe('isSlug', () => {
  it('accepts lowercase hyphen-separated slugs', () => {
    expect(isSlug('hello-world')).toBe(true);
    expect(isSlug('abc123')).toBe(true);
  });

  it('rejects slugs with spaces, uppercase, or leading/trailing hyphens', () => {
    expect(isSlug('hello world')).toBe(false);
    expect(isSlug('-starts-with-dash')).toBe(false);
    expect(isSlug('UPPER')).toBe(false);
  });
});

describe('isNumeric', () => {
  it('accepts numeric string representations', () => {
    expect(isNumeric('42')).toBe(true);
    expect(isNumeric('-3.14')).toBe(true);
    expect(isNumeric('1e10')).toBe(true);
  });

  it('rejects non-numeric strings', () => {
    expect(isNumeric('not-a-number')).toBe(false);
    expect(isNumeric('')).toBe(false);
  });
});

describe('isEmoji', () => {
  it('accepts Extended_Pictographic emoji', () => {
    expect(isEmoji('😀')).toBe(true);
    expect(isEmoji('😂')).toBe(true);
  });

  it('rejects plain text', () => {
    expect(isEmoji('not emoji')).toBe(false);
    expect(isEmoji('123')).toBe(false);
  });
});
