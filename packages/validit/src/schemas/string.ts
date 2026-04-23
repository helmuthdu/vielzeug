import type { MessageFn } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';
import { createConstraintValidator } from './constraint-factories';

export class StringSchema extends Schema<string> {
  constructor() {
    super([
      (value, path) =>
        typeof value === 'string' ? null : [{ code: ErrorCode.invalid_type, message: _messages().string_type(), path }],
    ]);
  }

  min(length: number, message: MessageFn<{ min: number; value: string }> = (ctx) => _messages().string_min(ctx)): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { min: number; value: string }>({
        check: (value) => value.length >= length,
        code: ErrorCode.too_small,
        context: (value) => ({ min: length, value }),
        message,
        params: () => ({ minimum: length }),
      }),
    );
  }

  max(length: number, message: MessageFn<{ max: number; value: string }> = (ctx) => _messages().string_max(ctx)): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { max: number; value: string }>({
        check: (value) => value.length <= length,
        code: ErrorCode.too_big,
        context: (value) => ({ max: length, value }),
        message,
        params: () => ({ maximum: length }),
      }),
    );
  }

  length(
    exact: number,
    message: MessageFn<{ exact: number; value: string }> = (ctx) => _messages().string_length(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { exact: number; value: string }>({
        check: (value) => value.length === exact,
        code: ErrorCode.invalid_length,
        context: (value) => ({ exact, value }),
        message,
        params: () => ({ exact }),
      }),
    );
  }

  nonEmpty(message: MessageFn<{ min: number; value: string }> = () => _messages().string_nonempty()): this {
    return this.min(1, message);
  }

  startsWith(
    prefix: string,
    message: MessageFn<{ prefix: string; value: string }> = (ctx) => _messages().string_starts_with(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { prefix: string; value: string }>({
        check: (value) => value.startsWith(prefix),
        code: ErrorCode.invalid_string,
        context: (value) => ({ prefix, value }),
        message,
        params: () => ({ prefix }),
      }),
    );
  }

  endsWith(
    suffix: string,
    message: MessageFn<{ suffix: string; value: string }> = (ctx) => _messages().string_ends_with(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { suffix: string; value: string }>({
        check: (value) => value.endsWith(suffix),
        code: ErrorCode.invalid_string,
        context: (value) => ({ suffix, value }),
        message,
        params: () => ({ suffix }),
      }),
    );
  }

  includes(
    substr: string,
    message: MessageFn<{ substr: string; value: string }> = (ctx) => _messages().string_includes(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { substr: string; value: string }>({
        check: (value) => value.includes(substr),
        code: ErrorCode.invalid_string,
        context: (value) => ({ substr, value }),
        message,
        params: () => ({ includes: substr }),
      }),
    );
  }

  regex(pattern: RegExp, message: MessageFn<{ value: string }> = (ctx) => _messages().string_regex(ctx)): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { value: string }>({
        check: (value) => pattern.test(value),
        code: ErrorCode.invalid_string,
        context: (value) => ({ value }),
        message,
        params: () => ({ pattern: pattern.source }),
      }),
    );
  }

  email(message: MessageFn<{ value: string }> = () => _messages().string_email()): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { value: string }>({
        check: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        code: ErrorCode.invalid_string,
        context: (value) => ({ value }),
        message,
        params: () => ({ format: 'email' }),
      }),
    );
  }

  url(message: MessageFn<{ value: string }> = () => _messages().string_url()): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { value: string }>({
        check: (value) => {
          try {
            new URL(value);

            return true;
          } catch {
            return false;
          }
        },
        code: ErrorCode.invalid_url,
        context: (value) => ({ value }),
        message,
        params: () => ({ format: 'url' }),
      }),
    );
  }

  uuid(message: MessageFn<{ value: string }> = () => _messages().string_uuid()): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { value: string }>({
        check: (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
        code: ErrorCode.invalid_string,
        context: (value) => ({ value }),
        message,
        params: () => ({ format: 'uuid' }),
      }),
    );
  }

  isoDate(message: MessageFn<{ value: string }> = () => _messages().string_date()): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { value: string }>({
        check: (value) => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return false;
          }

          const d = new Date(value);

          // Guard against roll-over dates like 2024-02-30 → 2024-03-01
          return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
        },
        code: ErrorCode.invalid_string,
        context: (value) => ({ value }),
        message,
        params: () => ({ format: 'iso-date' }),
      }),
    );
  }

  isoDateTime(message: MessageFn<{ value: string }> = () => _messages().string_datetime()): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { value: string }>({
        // Require at minimum YYYY-MM-DDTHH:MM structure before trying Date constructor
        check: (value) => /^\d{4}-\d{2}-\d{2}T[\d:.Z+-]+$/.test(value) && !Number.isNaN(new Date(value).getTime()),
        code: ErrorCode.invalid_string,
        context: (value) => ({ value }),
        message,
        params: () => ({ format: 'iso-datetime' }),
      }),
    );
  }

  trim(): this {
    return this._addPreprocessor((v: unknown) => (typeof v === 'string' ? v.trim() : v));
  }

  lowercase(): this {
    return this._addPreprocessor((v: unknown) => (typeof v === 'string' ? v.toLowerCase() : v));
  }

  uppercase(): this {
    return this._addPreprocessor((v: unknown) => (typeof v === 'string' ? v.toUpperCase() : v));
  }

  static coerce(): StringSchema {
    return new StringSchema()._addPreprocessor((v: unknown) => (v == null ? v : String(v)));
  }
}
