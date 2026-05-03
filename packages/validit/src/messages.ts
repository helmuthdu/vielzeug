export type Messages = {
  array: {
    length: (ctx: { exact: number; value: unknown[] }) => string;
    max: (ctx: { max: number; value: unknown[] }) => string;
    min: (ctx: { min: number; value: unknown[] }) => string;
    nonEmpty: () => string;
    type: () => string;
    unique: () => string;
  };
  boolean: {
    type: () => string;
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
  never: {
    invalid: () => string;
  };
  number: {
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
    type: () => string;
    unrecognizedKeys: (ctx: { keys: string[] }) => string;
  };
  refine: {
    default: () => string;
  };
  string: {
    date: () => string;
    dateTime: () => string;
    email: () => string;
    endsWith: (ctx: { suffix: string; value: string }) => string;
    includes: (ctx: { substr: string; value: string }) => string;
    ip: () => string;
    length: (ctx: { exact: number; value: string }) => string;
    max: (ctx: { max: number; value: string }) => string;
    min: (ctx: { min: number; value: string }) => string;
    nonEmpty: () => string;
    regex: (ctx: { value: string }) => string;
    startsWith: (ctx: { prefix: string; value: string }) => string;
    type: () => string;
    url: () => string;
    uuid: () => string;
  };
  tuple: {
    length: (ctx: { exact: number }) => string;
    type: () => string;
  };
  union: {
    invalid: () => string;
  };
  variant: {
    invalidDiscriminator: (ctx: { discriminator: string; expected: string[] }) => string;
    type: () => string;
  };
};

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K];
};

const _defaultMessages: Messages = {
  array: {
    length: ({ exact }) => `Must have exactly ${exact} items`,
    max: ({ max }) => `Must have at most ${max} items`,
    min: ({ min }) => `Must have at least ${min} items`,
    nonEmpty: () => 'Cannot be empty',
    type: () => 'Expected array',
    unique: () => 'All items must be unique',
  },
  boolean: {
    type: () => 'Expected boolean',
  },
  date: {
    max: ({ max }) => `Must be before ${max.toISOString()}`,
    min: ({ min }) => `Must be after ${min.toISOString()}`,
    type: () => 'Expected valid date',
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
  never: {
    invalid: () => 'Value is not allowed',
  },
  number: {
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
    type: () => 'Expected object',
    unrecognizedKeys: ({ keys }) => `Unrecognized keys: ${keys.join(', ')}`,
  },
  refine: {
    default: () => 'Invalid value',
  },
  string: {
    date: () => 'Invalid date',
    dateTime: () => 'Invalid datetime',
    email: () => 'Invalid email address',
    endsWith: ({ suffix }) => `Must end with "${suffix}"`,
    includes: ({ substr }) => `Must include "${substr}"`,
    ip: () => 'Invalid IP address',
    length: ({ exact }) => `Must be exactly ${exact} characters`,
    max: ({ max }) => `Must be at most ${max} characters`,
    min: ({ min }) => `Must be at least ${min} characters`,
    nonEmpty: () => 'Cannot be empty',
    regex: () => 'Invalid format',
    startsWith: ({ prefix }) => `Must start with "${prefix}"`,
    type: () => 'Expected string',
    url: () => 'Invalid URL',
    uuid: () => 'Invalid UUID',
  },
  tuple: {
    length: ({ exact }) => `Expected tuple of length ${exact}`,
    type: () => 'Expected array',
  },
  union: {
    invalid: () => 'Does not match any of the expected types',
  },
  variant: {
    invalidDiscriminator: ({ discriminator, expected }) =>
      `Invalid discriminator value at "${discriminator}": expected ${expected.map((k) => JSON.stringify(k)).join(' | ')}`,
    type: () => 'Expected object',
  },
};

let _activeMessages: Messages = _defaultMessages;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeMessages<T extends Record<string, unknown>>(base: T, patch: DeepPartial<T>): T {
  const out = { ...base } as Record<string, unknown>;

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;

    const baseValue = out[key];

    if (isRecord(baseValue) && isRecord(value)) {
      out[key] = mergeMessages(baseValue, value as DeepPartial<typeof baseValue>);
    } else {
      out[key] = value;
    }
  }

  return out as T;
}

/** Override any subset of default validation messages globally. */
export function configure(opts: { messages?: DeepPartial<Messages> }): void {
  if (opts.messages) _activeMessages = mergeMessages(_defaultMessages, opts.messages);
}

/** Reset all messages to defaults. */
export function reset(): void {
  _activeMessages = _defaultMessages;
}

/** @internal — for use by schema files only. */
export function _messages(): Messages {
  return _activeMessages;
}
