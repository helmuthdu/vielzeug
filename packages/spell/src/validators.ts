/**
 * Standalone validator functions — zero-dep, tree-shakeable helpers that return
 * a simple `boolean` (or a typed predicate) without constructing a Schema.
 * Useful in non-schema contexts such as conditional rendering, guards, etc.
 */

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
} from './formats';

/* -------------------- String validators -------------------- */

export const isValidEmail = (value: string): boolean => isEmail(value);
export const isValidUrl = (value: string, protocols?: readonly string[]): boolean => isUrl(value, protocols);
export const isValidUuid = (value: string): boolean => isUuid(value);
export const isValidIsoDate = (value: string): boolean => isIsoDate(value);
export const isValidIsoDateTime = (value: string): boolean => isIsoDateTime(value);
export const isValidIp = (value: string): boolean => isIp(value);
export const isValidCuid = (value: string): boolean => isCuid(value);
export const isValidCuid2 = (value: string): boolean => isCuid2(value);
export const isValidUlid = (value: string): boolean => isUlid(value);
export const isValidNanoid = (value: string, length?: number): boolean => isNanoid(value, length);
export const isValidBase64 = (value: string): boolean => isBase64(value);
export const isValidBase64url = (value: string): boolean => isBase64url(value);
export const isValidHex = (value: string): boolean => isHex(value);
export const isValidHexColor = (value: string): boolean => isHexColor(value);
export const isValidEmoji = (value: string): boolean => isEmoji(value);
export const isValidJwt = (value: string): boolean => isJwt(value);
export const isValidTime = (value: string): boolean => isTime(value);
export const isValidDuration = (value: string): boolean => isDuration(value);
export const isValidSemver = (value: string): boolean => isSemver(value);
export const isValidSlug = (value: string): boolean => isSlug(value);
export const isValidNumeric = (value: string): boolean => isNumeric(value);

/* -------------------- Generic range validators -------------------- */

export const hasMinLength = (value: string | unknown[], min: number): boolean => value.length >= min;
export const hasMaxLength = (value: string | unknown[], max: number): boolean => value.length <= max;
export const isInRange = (value: number, min: number, max: number): boolean => value >= min && value <= max;
export const isInteger = (value: number): boolean => Number.isInteger(value);
export const isPositive = (value: number): boolean => value > 0;
export const isNonNegative = (value: number): boolean => value >= 0;
export const isNegative = (value: number): boolean => value < 0;
export const isMultipleOf = (value: number, step: number): boolean => value % step === 0;

/* -------------------- Type guards -------------------- */

export const isString = (value: unknown): value is string => typeof value === 'string';
export const isNumber = (value: unknown): value is number => typeof value === 'number' && !Number.isNaN(value);
export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
export const isNullOrUndefined = (value: unknown): value is null | undefined => value == null;
export const isDate = (value: unknown): value is Date => value instanceof Date && !Number.isNaN(value.getTime());
export const isArray = (value: unknown): value is unknown[] => Array.isArray(value);
