import { isArray } from './isArray';
import { isBoolean } from './isBoolean';
import { isDate } from './isDate';
import { isDefined } from './isDefined';
import { isEmpty } from './isEmpty';
import { isEqual } from './isEqual';
import { isFunction } from './isFunction';
import { isMatch } from './isMatch';
import { isNil } from './isNil';
import { isNumber } from './isNumber';
import { isObject } from './isObject';
import { isPrimitive } from './isPrimitive';
import { isPromise } from './isPromise';
import { isRegex } from './isRegex';
import { isString } from './isString';
import { typeOf } from './typeOf';

/**
 * Namespace of type-checking and comparison utilities.
 *
 * @example
 * ```ts
 * is.string('hello');          // true
 * is.array([1, 2, 3]);         // true
 * is.nil(null);                // true
 * is.nil(undefined);           // true
 * is.equal([1, 2], [1, 2]);    // true
 * is.match({ a: 1, b: 2 }, { a: 1 }); // true
 * is.typeOf('hello');          // 'string'
 * ```
 */
export const is = {
  /** `true` if value is an array */
  array: isArray,
  /** `true` if value is a boolean */
  boolean: isBoolean,
  /** `true` if value is a valid Date */
  date: isDate,
  /** `true` if value is not `undefined` */
  defined: isDefined,
  /** `true` if value is null, undefined, `''`, `[]`, or `{}` */
  empty: isEmpty,
  /** Deep equality check */
  equal: isEqual,
  /** `true` if value is a function */
  fn: isFunction,
  /** Partial deep-match: `true` if `object` contains all of `source`'s properties */
  match: isMatch,
  /** `true` if value is null or undefined */
  nil: isNil,
  /** `true` if value is a number (excluding NaN) */
  number: isNumber,
  /** `true` if value is a plain object */
  object: isObject,
  /** `true` if value is a string, number, or boolean */
  primitive: isPrimitive,
  /** `true` if value is a Promise */
  promise: isPromise,
  /** `true` if value is a RegExp */
  regex: isRegex,
  /** `true` if value is a string */
  string: isString,
  /** Returns the runtime type tag of the value */
  typeOf,
};
