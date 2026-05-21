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
    date: () => string;
    dateTime: () => string;
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
    date: () => 'Invalid date',
    dateTime: () => 'Invalid datetime',
    duration: () => 'Invalid ISO 8601 duration',
    email: () => 'Invalid email address',
    emoji: () => 'Invalid emoji sequence',
    endsWith: ({ suffix }) => `Must end with "${suffix}"`,
    hex: () => 'Invalid hex',
    hexColor: () => 'Invalid hex color',
    includes: ({ substr }) => `Must include "${substr}"`,
    ip: () => 'Invalid IP address',
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
  variant: {
    invalidDiscriminator: ({ discriminator, expected }) =>
      `Invalid discriminator value at "${discriminator}": expected ${expected.map((k) => JSON.stringify(k)).join(' | ')}`,
    type: () => 'Expected object',
  },
};

let _activeMessages: Messages = _defaultMessages;

/** A function that receives internal warning messages from validit. */
export type Logger = (message: string) => void;

let _logger: Logger = (msg) => console.warn(msg);

/**
 * Emit an internal warning. Routes through the configured logger.
 * @internal
 */
export function _warn(message: string): void {
  _logger(message);
}

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

/**
 * Override any subset of default validation messages and/or the warning logger globally.
 * Pass `logger: null` to silence all internal warnings.
 */
export function configure(opts: { logger?: Logger | null; messages?: DeepPartial<Messages> }): void {
  if (opts.messages) _activeMessages = mergeMessages(_defaultMessages, opts.messages);

  if ('logger' in opts) _logger = opts.logger ?? (() => {});
}

/** Reset all messages and the logger to defaults. */
export function reset(): void {
  _activeMessages = _defaultMessages;
  _logger = (msg) => console.warn(msg);
}

/** @internal — for use by schema files only. */
export function _messages(): Messages {
  return _activeMessages;
}

/**
 * Run `fn` with a scoped message override. The original messages are restored
 * after `fn` returns (or throws).
 *
 * Note: this function is synchronous. Custom messages apply only to validators
 * that run synchronously within `fn`. Async validators (via `parseAsync`) that
 * start inside `fn` but resolve after it returns will use the restored messages.
 * Use `withMessagesAsync` when you need message scoping across async validators.
 */
export function withMessages<T>(patch: DeepPartial<Messages>, fn: () => T): T {
  const saved = _activeMessages;

  _activeMessages = mergeMessages(_defaultMessages, patch);

  try {
    return fn();
  } finally {
    _activeMessages = saved;
  }
}

/**
 * Async variant of `withMessages`. Awaits `fn` before restoring the original
 * messages, ensuring custom messages apply to all async validators within `fn`.
 */
export async function withMessagesAsync<T>(patch: DeepPartial<Messages>, fn: () => Promise<T>): Promise<T> {
  const saved = _activeMessages;

  _activeMessages = mergeMessages(_defaultMessages, patch);

  try {
    return await fn();
  } finally {
    _activeMessages = saved;
  }
}
