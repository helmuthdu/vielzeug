import { isPlainObject } from '@vielzeug/arsenal';

import { warn } from './_dev';
import { deepFreeze, defineOwnProperty, isUnsafeObjectKey, objectFromEntries } from './_object';
import type { ParseContext } from './types';

export type Messages = {
  array: {
    length: (ctx: { exact: number; value: unknown[] }) => string;
    max: (ctx: { max: number; value: unknown[] }) => string;
    min: (ctx: { min: number; value: unknown[] }) => string;
    nonEmpty: () => string;
    type: () => string;
    unique: () => string;
  };
  bigint: {
    max: (ctx: { max: bigint; value: bigint }) => string;
    min: (ctx: { min: bigint; value: bigint }) => string;
    multipleOf: (ctx: { step: bigint; value: bigint }) => string;
    negative: () => string;
    nonNegative: () => string;
    nonPositive: () => string;
    positive: () => string;
    type: () => string;
  };
  boolean: {
    type: () => string;
  };
  check: {
    default: () => string;
  };
  date: {
    max: (ctx: { max: Date; value: Date }) => string;
    min: (ctx: { min: Date; value: Date }) => string;
    type: () => string;
  };
  enum: {
    invalid: (ctx: { values: readonly unknown[] }) => string;
  };
  instanceof: {
    type: (ctx: { className: string }) => string;
  };
  literal: {
    expected: (ctx: { expected: unknown }) => string;
  };
  map: {
    max: (ctx: { max: number; value: Map<unknown, unknown> }) => string;
    min: (ctx: { min: number; value: Map<unknown, unknown> }) => string;
    nonEmpty: () => string;
    size: (ctx: { exact: number; value: Map<unknown, unknown> }) => string;
    type: () => string;
  };
  never: {
    invalid: () => string;
  };
  number: {
    finite: () => string;
    int: () => string;
    max: (ctx: { max: number; value: number }) => string;
    min: (ctx: { min: number; value: number }) => string;
    multipleOf: (ctx: { step: number; value: number }) => string;
    negative: () => string;
    nonNegative: () => string;
    nonPositive: () => string;
    positive: () => string;
    safe: () => string;
    type: () => string;
  };
  object: {
    invalidKeys: (ctx: { keys: string[] }) => string;
    type: () => string;
  };
  set: {
    max: (ctx: { max: number; value: Set<unknown> }) => string;
    min: (ctx: { min: number; value: Set<unknown> }) => string;
    nonEmpty: () => string;
    size: (ctx: { exact: number; value: Set<unknown> }) => string;
    type: () => string;
  };
  string: {
    base64: () => string;
    base64url: () => string;
    cuid: () => string;
    cuid2: () => string;
    isoDate: () => string;
    isoDateTime: () => string;
    duration: () => string;
    email: () => string;
    emoji: () => string;
    endsWith: (ctx: { suffix: string; value: string }) => string;
    hex: () => string;
    hexColor: () => string;
    includes: (ctx: { substr: string; value: string }) => string;
    ip: () => string;
    jwt: () => string;
    length: (ctx: { exact: number; value: string }) => string;
    max: (ctx: { max: number; value: string }) => string;
    min: (ctx: { min: number; value: string }) => string;
    nanoid: () => string;
    nonEmpty: () => string;
    numeric: () => string;
    regex: (ctx: { value: string }) => string;
    semver: () => string;
    slug: () => string;
    startsWith: (ctx: { prefix: string; value: string }) => string;
    time: () => string;
    type: () => string;
    ulid: () => string;
    url: () => string;
    uuid: () => string;
  };
  tuple: {
    length: (ctx: { exact: number }) => string;
    min: (ctx: { min: number }) => string;
    type: () => string;
  };
  union: {
    invalid: () => string;
  };
  discriminatedUnion: {
    invalidDiscriminator: (ctx: { discriminator: string; expected: string[] }) => string;
    type: () => string;
  };
};

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K];
};

const builtinMessages: Messages = {
  array: {
    length: ({ exact }) => `Must have exactly ${exact} items`,
    max: ({ max }) => `Must have at most ${max} items`,
    min: ({ min }) => `Must have at least ${min} items`,
    nonEmpty: () => 'Cannot be empty',
    type: () => 'Expected array',
    unique: () => 'All items must be unique',
  },
  bigint: {
    max: ({ max }) => `Must be at most ${max}`,
    min: ({ min }) => `Must be at least ${min}`,
    multipleOf: ({ step }) => `Must be a multiple of ${step}`,
    negative: () => 'Must be negative',
    nonNegative: () => 'Must be non-negative',
    nonPositive: () => 'Must be non-positive',
    positive: () => 'Must be positive',
    type: () => 'Expected bigint',
  },
  boolean: {
    type: () => 'Expected boolean',
  },
  check: {
    default: () => 'Invalid value',
  },
  date: {
    max: ({ max }) => `Must be before ${max.toISOString()}`,
    min: ({ min }) => `Must be after ${min.toISOString()}`,
    type: () => 'Expected valid date',
  },
  discriminatedUnion: {
    invalidDiscriminator: ({ discriminator, expected }) =>
      `Invalid discriminator value at "${discriminator}": expected ${expected.map((k) => JSON.stringify(k)).join(' | ')}`,
    type: () => 'Expected object',
  },
  enum: {
    invalid: ({ values }) => `Expected one of: ${values.map((v) => JSON.stringify(v)).join(', ')}`,
  },
  instanceof: {
    type: ({ className }) => `Expected instance of ${className}`,
  },
  literal: {
    expected: ({ expected }) => `Expected ${JSON.stringify(expected)}`,
  },
  map: {
    max: ({ max }) => `Must contain at most ${max} entries`,
    min: ({ min }) => `Must contain at least ${min} entries`,
    nonEmpty: () => 'Cannot be empty',
    size: ({ exact }) => `Must contain exactly ${exact} entries`,
    type: () => 'Expected map',
  },
  never: {
    invalid: () => 'Value is not allowed',
  },
  number: {
    finite: () => 'Must be finite',
    int: () => 'Must be an integer',
    max: ({ max }) => `Must be at most ${max}`,
    min: ({ min }) => `Must be at least ${min}`,
    multipleOf: ({ step }) => `Must be a multiple of ${step}`,
    negative: () => 'Must be negative',
    nonNegative: () => 'Must be non-negative',
    nonPositive: () => 'Must be non-positive',
    positive: () => 'Must be positive',
    safe: () => 'Must be a safe integer',
    type: () => 'Expected number',
  },
  object: {
    invalidKeys: ({ keys }) => `Unrecognized keys: ${keys.join(', ')}`,
    type: () => 'Expected object',
  },
  set: {
    max: ({ max }) => `Must contain at most ${max} items`,
    min: ({ min }) => `Must contain at least ${min} items`,
    nonEmpty: () => 'Cannot be empty',
    size: ({ exact }) => `Must contain exactly ${exact} items`,
    type: () => 'Expected set',
  },
  string: {
    base64: () => 'Invalid base64',
    base64url: () => 'Invalid base64url',
    cuid: () => 'Invalid CUID',
    cuid2: () => 'Invalid CUID2',
    duration: () => 'Invalid ISO 8601 duration',
    email: () => 'Invalid email address',
    emoji: () => 'Invalid emoji sequence',
    endsWith: ({ suffix }) => `Must end with "${suffix}"`,
    hex: () => 'Invalid hex',
    hexColor: () => 'Invalid hex color',
    includes: ({ substr }) => `Must include "${substr}"`,
    ip: () => 'Invalid IP address',
    isoDate: () => 'Invalid date',
    isoDateTime: () => 'Invalid datetime',
    jwt: () => 'Invalid JWT',
    length: ({ exact }) => `Must be exactly ${exact} characters`,
    max: ({ max }) => `Must be at most ${max} characters`,
    min: ({ min }) => `Must be at least ${min} characters`,
    nanoid: () => 'Invalid NanoID',
    nonEmpty: () => 'Cannot be empty',
    numeric: () => 'Invalid numeric string',
    regex: () => 'Invalid format',
    semver: () => 'Invalid semver',
    slug: () => 'Invalid slug',
    startsWith: ({ prefix }) => `Must start with "${prefix}"`,
    time: () => 'Invalid time',
    type: () => 'Expected string',
    ulid: () => 'Invalid ULID',
    url: () => 'Invalid URL',
    uuid: () => 'Invalid UUID',
  },
  tuple: {
    length: ({ exact }) => `Expected tuple of length ${exact}`,
    min: ({ min }) => `Expected tuple with at least ${min} items`,
    type: () => 'Expected array',
  },
  union: {
    invalid: () => 'Does not match any of the expected types',
  },
};

function mergeMessages<T extends Record<string, unknown>>(base: T, patch: DeepPartial<T>): T {
  const out = objectFromEntries(Object.entries(base));

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;

    if (isUnsafeObjectKey(key)) {
      warn(`Ignoring unsafe message override key "${key}" to prevent prototype mutation.`);
      continue;
    }

    const baseValue = out[key];

    defineOwnProperty(
      out,
      key,
      isPlainObject(baseValue) && isPlainObject(value)
        ? mergeMessages(baseValue, value as DeepPartial<typeof baseValue>)
        : value,
    );
  }

  return out as T;
}

/**
 * Creates a frozen parse context with the built-in messages merged with `messages`. Pass it to
 * parse methods when validation messages vary by request, locale, or form. Spell never stores it globally.
 */
export function createParseContext(messages: DeepPartial<Messages> = {}): ParseContext {
  return deepFreeze({ messages: mergeMessages(builtinMessages, messages) });
}

/** The context used when a parse method receives none. */
export const defaultContext: ParseContext = createParseContext();
