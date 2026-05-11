import type { MessageFn } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';
import { createConstraintValidator } from './constraint-factories';

export class StringSchema<Input = string> extends Schema<string, Input> {
  private _format(
    format: string,
    check: (value: string) => boolean,
    message: MessageFn<{ value: string }>,
    code: ErrorCode = ErrorCode.invalid_string,
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<string, { value: string }>({
        check,
        code,
        message,
        params: { format },
      }),
    );
  }

  private _formatRegex(
    format: string,
    pattern: RegExp,
    message: MessageFn<{ value: string }>,
    code: ErrorCode = ErrorCode.invalid_string,
  ): this {
    return this._format(format, (value) => pattern.test(value), message, code);
  }

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
    return this._formatRegex('email', /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, message);
  }

  url(message: MessageFn<{ value: string }> = () => _messages().string.url()): this {
    return this._format(
      'url',
      (value) => {
        try {
          new URL(value);

          return true;
        } catch {
          return false;
        }
      },
      message,
      ErrorCode.invalid_url,
    );
  }

  uuid(message: MessageFn<{ value: string }> = () => _messages().string.uuid()): this {
    return this._formatRegex('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, message);
  }

  isoDate(message: MessageFn<{ value: string }> = () => _messages().string.date()): this {
    return this._format(
      'iso-date',
      (value) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return false;
        }

        const d = new Date(value);

        return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
      },
      message,
    );
  }

  isoDateTime(message: MessageFn<{ value: string }> = () => _messages().string.dateTime()): this {
    return this._format(
      'iso-datetime',
      (value) => /^\d{4}-\d{2}-\d{2}T[\d:.Z+-]+$/.test(value) && !Number.isNaN(new Date(value).getTime()),
      message,
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
    return this._format(
      'ip',
      (value) => {
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([\da-f]{0,4}:){2,7}[\da-f]{0,4}$/i;

        if (!ipv4Regex.test(value) && !ipv6Regex.test(value)) return false;

        if (ipv4Regex.test(value)) {
          return value.split('.').every((octet) => {
            const num = parseInt(octet, 10);

            return num >= 0 && num <= 255;
          });
        }

        return true;
      },
      message,
    );
  }

  cuid(message: MessageFn<{ value: string }> = () => 'Invalid CUID'): this {
    return this._formatRegex('cuid', /^c[a-z0-9]{8,}$/i, message);
  }

  cuid2(message: MessageFn<{ value: string }> = () => 'Invalid CUID2'): this {
    return this._formatRegex('cuid2', /^[a-z][a-z0-9]{23}$/i, message);
  }

  ulid(message: MessageFn<{ value: string }> = () => 'Invalid ULID'): this {
    return this._formatRegex('ulid', /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/, message);
  }

  nanoid(message: MessageFn<{ value: string }> = () => 'Invalid NanoID'): this {
    return this._formatRegex('nanoid', /^[A-Za-z0-9_-]{10,}$/, message);
  }

  base64(message: MessageFn<{ value: string }> = () => 'Invalid base64'): this {
    return this._formatRegex(
      'base64',
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
      message,
      ErrorCode.invalid_base64,
    );
  }

  base64url(message: MessageFn<{ value: string }> = () => 'Invalid base64url'): this {
    return this._formatRegex('base64url', /^[A-Za-z0-9_-]+$/, message, ErrorCode.invalid_base64);
  }

  hex(message: MessageFn<{ value: string }> = () => 'Invalid hex'): this {
    return this._formatRegex('hex', /^[A-Fa-f0-9]+$/, message);
  }

  hexColor(message: MessageFn<{ value: string }> = () => 'Invalid hex color'): this {
    return this._formatRegex('hex-color', /^#(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/, message);
  }

  emoji(message: MessageFn<{ value: string }> = () => 'Invalid emoji sequence'): this {
    return this._formatRegex('emoji', /^\p{Extended_Pictographic}+$/u, message);
  }

  jwt(message: MessageFn<{ value: string }> = () => 'Invalid JWT'): this {
    return this._formatRegex('jwt', /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, message);
  }

  time(message: MessageFn<{ value: string }> = () => 'Invalid time'): this {
    return this._formatRegex('time', /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/, message);
  }

  duration(message: MessageFn<{ value: string }> = () => 'Invalid ISO 8601 duration'): this {
    return this._formatRegex(
      'duration',
      /^P(?=\d|T\d)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(\d+H)?(\d+M)?(\d+(?:\.\d+)?S)?)?$/,
      message,
      ErrorCode.invalid_duration,
    );
  }

  semver(message: MessageFn<{ value: string }> = () => 'Invalid semver'): this {
    return this._formatRegex(
      'semver',
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/,
      message,
    );
  }

  slug(message: MessageFn<{ value: string }> = () => 'Invalid slug'): this {
    return this._formatRegex('slug', /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message);
  }

  numeric(message: MessageFn<{ value: string }> = () => 'Invalid numeric string'): this {
    return this._formatRegex('numeric', /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i, message);
  }

  static coerce(): StringSchema<unknown> {
    return new StringSchema().preprocess((v: unknown) => (v == null ? v : String(v)));
  }
}
