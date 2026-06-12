/**
 * Standalone validator functions — zero-dep, tree-shakeable helpers that return
 * a simple `boolean` (or a typed predicate) without constructing a Schema.
 * Useful in non-schema contexts such as conditional rendering, guards, etc.
 */

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
