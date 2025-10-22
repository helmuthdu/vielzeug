import { ge } from './ge';
import { gt } from './gt';
import { isDefined } from './isDefined';
import { isEmpty } from './isEmpty';
import { isEqual } from './isEqual';
import { isEven } from './isEven';
import { isMatch } from './isMatch';
import { isNegative } from './isNegative';
import { isNil } from './isNil';
import { isOdd } from './isOdd';
import { isPositive } from './isPositive';
import { isRegex } from './isRegex';
import { isWithin } from './isWithin';
import { isZero } from './isZero';
import { le } from './le';
import { lt } from './lt';
import { type ArgType, typeOf } from './typeOf';

type isType =
  | ArgType
  | 'defined'
  | 'empty'
  | 'eq'
  | 'even'
  | 'ge'
  | 'gt'
  | 'le'
  | 'lt'
  | 'match'
  | 'ne'
  | 'negative'
  | 'nil'
  | 'odd'
  | 'positive'
  | 'regex'
  | 'within'
  | 'zero';

/**
 * @description
 * Checks if the value type of argument.
 *
 * @example
 * ```ts
 * is('array', []);
 * is('boolean', true);
 * is('date', new Date());
 * is('defined', 123);
 * is('empty', []);
 * is('even', 2);
 * is('function', () => {});
 * is('match', { a: 1, b: 2 }, { a: 1 });
 * is('nan', Number.NaN);
 * is('negative', -123);
 * is('nil', null);
 * is('null', null);
 * is('number', 123);
 * is('object', {});
 * is('odd', 3);
 * is('positive', 123);
 * is('string', 'hello');
 * is('symbol', Symbol('test'));
 * is('regex', /abc/);
 * is('string', 'hello world');
 * is('undefined', undefined);
 * is('within', 1, 2, 3);
 * is('zero', 0);
 * is('eq', [1, 2, 3], [1, 2, 3]);
 * is('ne', [1, 2, 3], [1, 2]);
 * is('ge', 5, 5);
 * is('gt', 5, 3);
 * is('le', 5, 5);
 * is('lt', 3, 5);
 * ```
 *
 * @param type - The type to check against.
 * @param args - The argument to be checked.
 *
 * @returns `true` if the value is of the specified type, else `false`.
 */
export function is(type: 'within', ...args: Parameters<typeof isWithin>): boolean;
export function is(type: 'eq', ...args: Parameters<typeof isEqual>): boolean;
export function is(type: 'ne', ...args: Parameters<typeof isEqual>): boolean;
export function is(type: 'gt', ...args: Parameters<typeof gt>): boolean;
export function is(type: 'ge', ...args: Parameters<typeof ge>): boolean;
export function is(type: 'lt', ...args: Parameters<typeof lt>): boolean;
export function is(type: 'le', ...args: Parameters<typeof le>): boolean;
export function is(type: 'match', ...args: Parameters<typeof isMatch>): boolean;
export function is(type: 'empty', ...args: Parameters<typeof isEmpty>): boolean;
export function is(type: 'array', arg: unknown): arg is Array<unknown>;
export function is(type: 'string', arg: unknown): arg is string;
export function is(type: 'number', arg: unknown): arg is number;
export function is(type: 'object', arg: unknown): arg is object;
export function is(type: 'nil', arg: unknown): arg is null | undefined;
export function is(type: 'primitive', arg: unknown): arg is string | number | boolean;
export function is(type: isType, arg: unknown): boolean;
export function is(type: string, arg: unknown): boolean {
  if (!type) {
    throw new Error('Type must be provided');
  }

  const compare = {
    defined: isDefined,
    empty: isEmpty,
    eq: (args: Parameters<typeof isEqual>) => isEqual(...args),
    even: isEven,
    ge: (args: Parameters<typeof ge>) => ge(...args),
    gt: (args: Parameters<typeof gt>) => gt(...args),
    le: (args: Parameters<typeof le>) => le(...args),
    lt: (args: Parameters<typeof lt>) => lt(...args),
    match: (args: Parameters<typeof isMatch>) => isMatch(...args),
    ne: (args: Parameters<typeof isEqual>) => !isEqual(...args),
    negative: isNegative,
    nil: isNil,
    odd: isOdd,
    positive: isPositive,
    regex: isRegex,
    within: (args: Parameters<typeof isWithin>) => isWithin(...args),
    zero: isZero,
  };

  return compare[type as keyof typeof compare]?.(arg) ?? typeOf(arg) === type;
}
