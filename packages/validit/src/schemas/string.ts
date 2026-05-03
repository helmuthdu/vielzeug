import type { MessageFn } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';
import { createConstraintValidator } from './constraint-factories';

export class StringSchema extends Schema<string> {
  constructor() {
    super([
      (value, path) =>
        typeof value === 'string' ? null : [{ code: ErrorCode.invalid_type, message: _messages().string.type(), path }],
    ]);
  }

  min(length: number, message: MessageFn<{ min: number; value: string }> = (ctx) => _messages().string.min(ctx)): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { min: number; value: string }>({
        check: (value) => value.length >= length,
        code: ErrorCode.too_small,
        context: { min: length },
        message,
        params: { minimum: length },
      }),
    );
  }

  max(length: number, message: MessageFn<{ max: number; value: string }> = (ctx) => _messages().string.max(ctx)): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { max: number; value: string }>({
        check: (value) => value.length <= length,
        code: ErrorCode.too_big,
        context: { max: length },
        message,
        params: { maximum: length },
      }),
    );
  }

  length(
    exact: number,
    message: MessageFn<{ exact: number; value: string }> = (ctx) => _messages().string.length(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { exact: number; value: string }>({
        check: (value) => value.length === exact,
        code: ErrorCode.invalid_length,
        context: { exact },
        message,
        params: { exact },
      }),
    );
  }

  nonEmpty(message: MessageFn<{ min: number; value: string }> = () => _messages().string.nonEmpty()): this {
    return this.min(1, message);
  }

  startsWith(
    prefix: string,
    message: MessageFn<{ prefix: string; value: string }> = (ctx) => _messages().string.startsWith(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { prefix: string; value: string }>({
        check: (value) => value.startsWith(prefix),
        code: ErrorCode.invalid_string,
        context: { prefix },
        message,
        params: { prefix },
      }),
    );
  }

  endsWith(
    suffix: string,
    message: MessageFn<{ suffix: string; value: string }> = (ctx) => _messages().string.endsWith(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { suffix: string; value: string }>({
        check: (value) => value.endsWith(suffix),
        code: ErrorCode.invalid_string,
        context: { suffix },
        message,
        params: { suffix },
      }),
    );
  }

  includes(
    substr: string,
    message: MessageFn<{ substr: string; value: string }> = (ctx) => _messages().string.includes(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { substr: string; value: string }>({
        check: (value) => value.includes(substr),
        code: ErrorCode.invalid_string,
        context: { substr },
        message,
        params: { includes: substr },
      }),
    );
  }

  regex(pattern: RegExp, message: MessageFn<{ value: string }> = (ctx) => _messages().string.regex(ctx)): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { value: string }>({
        check: (value) => pattern.test(value),
        code: ErrorCode.invalid_string,
        message,
        params: { pattern: pattern.source },
      }),
    );
  }

  email(message: MessageFn<{ value: string }> = () => _messages().string.email()): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { value: string }>({
        check: (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value),
        code: ErrorCode.invalid_string,
        message,
        params: { format: 'email' },
      }),
    );
  }

  url(message: MessageFn<{ value: string }> = () => _messages().string.url()): this {
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
        message,
        params: { format: 'url' },
      }),
    );
  }

  uuid(message: MessageFn<{ value: string }> = () => _messages().string.uuid()): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { value: string }>({
        check: (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
        code: ErrorCode.invalid_string,
        message,
        params: { format: 'uuid' },
      }),
    );
  }

  isoDate(message: MessageFn<{ value: string }> = () => _messages().string.date()): this {
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
        message,
        params: { format: 'iso-date' },
      }),
    );
  }

  isoDateTime(message: MessageFn<{ value: string }> = () => _messages().string.dateTime()): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { value: string }>({
        // Require at minimum YYYY-MM-DDTHH:MM structure before trying Date constructor
        check: (value) => /^\d{4}-\d{2}-\d{2}T[\d:.Z+-]+$/.test(value) && !Number.isNaN(new Date(value).getTime()),
        code: ErrorCode.invalid_string,
        message,
        params: { format: 'iso-datetime' },
      }),
    );
  }

  trim(): this {
    return this.preprocess((v: unknown) => (typeof v === 'string' ? v.trim() : v));
  }

  lowercase(): this {
    return this.preprocess((v: unknown) => (typeof v === 'string' ? v.toLowerCase() : v));
  }

  uppercase(): this {
    return this.preprocess((v: unknown) => (typeof v === 'string' ? v.toUpperCase() : v));
  }

  ip(message: MessageFn<{ value: string }> = () => _messages().string.ip()): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { value: string }>({
        check: (value) => {
          // IPv4 or IPv6
          const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
          const ipv6Regex = /^([\da-f]{0,4}:){2,7}[\da-f]{0,4}$/i;

          if (!ipv4Regex.test(value) && !ipv6Regex.test(value)) return false;

          // For IPv4, validate each octet is 0-255
          if (ipv4Regex.test(value)) {
            return value.split('.').every((octet) => {
              const num = parseInt(octet, 10);

              return num >= 0 && num <= 255;
            });
          }

          return true;
        },
        code: ErrorCode.invalid_string,
        message,
        params: { format: 'ip' },
      }),
    );
  }

  static coerce(): StringSchema {
    return new StringSchema().preprocess((v: unknown) => (v == null ? v : String(v)));
  }
}
