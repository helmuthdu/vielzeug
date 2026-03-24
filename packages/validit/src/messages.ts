export type Messages = {
  array_length: (ctx: { exact: number }) => string;
  array_max: (ctx: { max: number }) => string;
  array_min: (ctx: { min: number }) => string;
  array_nonempty: () => string;
  array_type: () => string;
  boolean_type: () => string;
  date_max: (ctx: { max: Date; value: Date }) => string;
  date_min: (ctx: { min: Date; value: Date }) => string;
  date_type: () => string;
  never_invalid: () => string;
  number_int: () => string;
  number_max: (ctx: { max: number; value: number }) => string;
  number_min: (ctx: { min: number; value: number }) => string;
  number_multiple_of: (ctx: { step: number; value: number }) => string;
  number_negative: () => string;
  number_non_negative: () => string;
  number_non_positive: () => string;
  number_positive: () => string;
  number_type: () => string;
  object_type: () => string;
  object_unrecognized_keys: (ctx: { keys: string[] }) => string;
  refine_default: () => string;
  string_date: () => string;
  string_datetime: () => string;
  string_email: () => string;
  string_ends_with: (ctx: { suffix: string; value: string }) => string;
  string_includes: (ctx: { substr: string; value: string }) => string;
  string_length: (ctx: { exact: number; value: string }) => string;
  string_max: (ctx: { max: number; value: string }) => string;
  string_min: (ctx: { min: number; value: string }) => string;
  string_nonempty: () => string;
  string_regex: (ctx: { value: string }) => string;
  string_starts_with: (ctx: { prefix: string; value: string }) => string;
  string_type: () => string;
  string_url: () => string;
  string_uuid: () => string;
  tuple_length: (ctx: { exact: number }) => string;
  tuple_type: () => string;
  union_invalid: () => string;
};

const _defaultMessages: Messages = {
  array_length: ({ exact }) => `Must have exactly ${exact} items`,
  array_max: ({ max }) => `Must have at most ${max} items`,
  array_min: ({ min }) => `Must have at least ${min} items`,
  array_nonempty: () => 'Cannot be empty',
  array_type: () => 'Expected array',
  boolean_type: () => 'Expected boolean',
  date_max: ({ max }) => `Must be before ${max.toISOString()}`,
  date_min: ({ min }) => `Must be after ${min.toISOString()}`,
  date_type: () => 'Expected valid date',
  never_invalid: () => 'Value is not allowed',
  number_int: () => 'Must be an integer',
  number_max: ({ max }) => `Must be at most ${max}`,
  number_min: ({ min }) => `Must be at least ${min}`,
  number_multiple_of: ({ step }) => `Must be a multiple of ${step}`,
  number_negative: () => 'Must be negative',
  number_non_negative: () => 'Must be non-negative',
  number_non_positive: () => 'Must be non-positive',
  number_positive: () => 'Must be positive',
  number_type: () => 'Expected number',
  object_type: () => 'Expected object',
  object_unrecognized_keys: ({ keys }) => `Unrecognized keys: ${keys.join(', ')}`,
  refine_default: () => 'Invalid value',
  string_date: () => 'Invalid date',
  string_datetime: () => 'Invalid datetime',
  string_email: () => 'Invalid email address',
  string_ends_with: ({ suffix }) => `Must end with "${suffix}"`,
  string_includes: ({ substr }) => `Must include "${substr}"`,
  string_length: ({ exact }) => `Must be exactly ${exact} characters`,
  string_max: ({ max }) => `Must be at most ${max} characters`,
  string_min: ({ min }) => `Must be at least ${min} characters`,
  string_nonempty: () => 'Cannot be empty',
  string_regex: () => 'Invalid format',
  string_starts_with: ({ prefix }) => `Must start with "${prefix}"`,
  string_type: () => 'Expected string',
  string_url: () => 'Invalid URL',
  string_uuid: () => 'Invalid UUID',
  tuple_length: ({ exact }) => `Expected tuple of length ${exact}`,
  tuple_type: () => 'Expected array',
  union_invalid: () => 'Does not match any of the expected types',
};

let _activeMessages: Messages = _defaultMessages;

/** Override any subset of default validation messages globally. */
export function configure(opts: { messages?: Partial<Messages> }): void {
  if (opts.messages) _activeMessages = { ..._defaultMessages, ...opts.messages };
}

/** @internal — for use by schema files only. */
export function _messages(): Messages {
  return _activeMessages;
}
