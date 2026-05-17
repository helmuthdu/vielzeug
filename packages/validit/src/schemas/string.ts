import type { MessageFn } from '../core';

import { ErrorCode, resolveMessage, Schema } from '../core';
import { _messages } from '../messages';

type UrlOptions = {
  protocols?: readonly string[];
};

export class StringSchema<Input = string> extends Schema<string, Input> {
  private _format(
    format: string,
    check: (value: string) => boolean,
    message: MessageFn<{ value: string }>,
    code: ErrorCode = ErrorCode.invalid_string,
  ): this {
    return this._addValidator((value, path) => {
      const typed = value as string;

      if (check(typed)) return null;

      return [{ code, message: resolveMessage(message, { value: typed }), params: { format }, path }];
    });
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
    return this._addValidator((value, path) => {
      const typed = value as string;

      if (typed.length >= length) return null;

      return [
        {
          code: ErrorCode.too_small,
          message: resolveMessage(message, { min: length, value: typed }),
          params: { minimum: length },
          path,
        },
      ];
    });
  }

  max(length: number, message: MessageFn<{ max: number; value: string }> = (ctx) => _messages().string.max(ctx)): this {
    return this._addValidator((value, path) => {
      const typed = value as string;

      if (typed.length <= length) return null;

      return [
        {
          code: ErrorCode.too_big,
          message: resolveMessage(message, { max: length, value: typed }),
          params: { maximum: length },
          path,
        },
      ];
    });
  }

  length(
    exact: number,
    message: MessageFn<{ exact: number; value: string }> = (ctx) => _messages().string.length(ctx),
  ): this {
    return this._addValidator((value, path) => {
      const typed = value as string;

      if (typed.length === exact) return null;

      return [
        {
          code: ErrorCode.invalid_length,
          message: resolveMessage(message, { exact, value: typed }),
          params: { exact },
          path,
        },
      ];
    });
  }

  nonEmpty(message: MessageFn<{ min: number; value: string }> = () => _messages().string.nonEmpty()): this {
    return this.min(1, message);
  }

  startsWith(
    prefix: string,
    message: MessageFn<{ prefix: string; value: string }> = (ctx) => _messages().string.startsWith(ctx),
  ): this {
    return this._addValidator((value, path) => {
      const typed = value as string;

      if (typed.startsWith(prefix)) return null;

      return [
        {
          code: ErrorCode.invalid_string,
          message: resolveMessage(message, { prefix, value: typed }),
          params: { prefix },
          path,
        },
      ];
    });
  }

  endsWith(
    suffix: string,
    message: MessageFn<{ suffix: string; value: string }> = (ctx) => _messages().string.endsWith(ctx),
  ): this {
    return this._addValidator((value, path) => {
      const typed = value as string;

      if (typed.endsWith(suffix)) return null;

      return [
        {
          code: ErrorCode.invalid_string,
          message: resolveMessage(message, { suffix, value: typed }),
          params: { suffix },
          path,
        },
      ];
    });
  }

  includes(
    substr: string,
    message: MessageFn<{ substr: string; value: string }> = (ctx) => _messages().string.includes(ctx),
  ): this {
    return this._addValidator((value, path) => {
      const typed = value as string;

      if (typed.includes(substr)) return null;

      return [
        {
          code: ErrorCode.invalid_string,
          message: resolveMessage(message, { substr, value: typed }),
          params: { includes: substr },
          path,
        },
      ];
    });
  }

  regex(pattern: RegExp, message: MessageFn<{ value: string }> = (ctx) => _messages().string.regex(ctx)): this {
    return this._addValidator((value, path) => {
      const typed = value as string;

      if (pattern.test(typed)) return null;

      return [
        {
          code: ErrorCode.invalid_string,
          message: resolveMessage(message, { value: typed }),
          params: { pattern: pattern.source },
          path,
        },
      ];
    });
  }

  email(message: MessageFn<{ value: string }> = () => _messages().string.email()): this {
    return this._formatRegex('email', /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, message);
  }

  url(message?: MessageFn<{ value: string }>): this;
  url(options: UrlOptions, message?: MessageFn<{ value: string }>): this;
  url(
    optionsOrMessage: MessageFn<{ value: string }> | UrlOptions = {},
    maybeMessage: MessageFn<{ value: string }> = () => _messages().string.url(),
  ): this {
    const options =
      typeof optionsOrMessage === 'function' || typeof optionsOrMessage === 'string' ? {} : optionsOrMessage;
    const message =
      typeof optionsOrMessage === 'function' || typeof optionsOrMessage === 'string' ? optionsOrMessage : maybeMessage;
    const allowedProtocols = new Set((options.protocols ?? ['http', 'https']).map((p) => p.toLowerCase()));

    return this._format(
      'url',
      (value) => {
        try {
          const parsed = new URL(value);
          const protocol = parsed.protocol.replace(':', '').toLowerCase();

          if (!allowedProtocols.has(protocol)) return false;

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
    // HH:MM with optional seconds, optional fractional seconds, optional timezone offset or Z.
    return this._format(
      'iso-datetime',
      (value) =>
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value) &&
        !Number.isNaN(new Date(value).getTime()),
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
        // IPv4: validate octet ranges
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
          return value.split('.').every((octet) => {
            const n = parseInt(octet, 10);

            return n >= 0 && n <= 255;
          });
        }

        // IPv6: delegate to URL parser which handles all valid forms including
        // compressed notation (::1, 2001:db8::1) and edge cases
        try {
          new URL(`http://[${value}]/`);

          return true;
        } catch {
          return false;
        }
      },
      message,
    );
  }

  cuid(message: MessageFn<{ value: string }> = () => _messages().string.cuid()): this {
    return this._formatRegex('cuid', /^c[a-z0-9]{8,}$/, message);
  }

  cuid2(message: MessageFn<{ value: string }> = () => _messages().string.cuid2()): this {
    return this._formatRegex('cuid2', /^[a-z][a-z0-9]{23}$/, message);
  }

  ulid(message: MessageFn<{ value: string }> = () => _messages().string.ulid()): this {
    return this._formatRegex('ulid', /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/, message);
  }

  nanoid(message: MessageFn<{ value: string }> = () => _messages().string.nanoid()): this {
    return this._formatRegex('nanoid', /^[A-Za-z0-9_-]{10,}$/, message);
  }

  base64(message: MessageFn<{ value: string }> = () => _messages().string.base64()): this {
    // Requires at least one complete group; rejects empty strings.
    return this._formatRegex(
      'base64',
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/,
      message,
      ErrorCode.invalid_base64,
    );
  }

  base64url(message: MessageFn<{ value: string }> = () => _messages().string.base64url()): this {
    return this._formatRegex('base64url', /^[A-Za-z0-9_-]+$/, message, ErrorCode.invalid_base64);
  }

  hex(message: MessageFn<{ value: string }> = () => _messages().string.hex()): this {
    return this._formatRegex('hex', /^[A-Fa-f0-9]+$/, message);
  }

  hexColor(message: MessageFn<{ value: string }> = () => _messages().string.hexColor()): this {
    return this._formatRegex('hex-color', /^#(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/, message);
  }

  emoji(message: MessageFn<{ value: string }> = () => _messages().string.emoji()): this {
    return this._formatRegex('emoji', /^\p{Extended_Pictographic}+$/u, message);
  }

  jwt(message: MessageFn<{ value: string }> = () => _messages().string.jwt()): this {
    return this._formatRegex('jwt', /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, message);
  }

  time(message: MessageFn<{ value: string }> = () => _messages().string.time()): this {
    return this._formatRegex('time', /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/, message);
  }

  duration(message: MessageFn<{ value: string }> = () => _messages().string.duration()): this {
    return this._formatRegex(
      'duration',
      /^P(?=\d|T\d)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(\d+H)?(\d+M)?(\d+(?:\.\d+)?S)?)?$/,
      message,
      ErrorCode.invalid_duration,
    );
  }

  semver(message: MessageFn<{ value: string }> = () => _messages().string.semver()): this {
    return this._formatRegex(
      'semver',
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/,
      message,
    );
  }

  slug(message: MessageFn<{ value: string }> = () => _messages().string.slug()): this {
    return this._formatRegex('slug', /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message);
  }

  numeric(message: MessageFn<{ value: string }> = () => _messages().string.numeric()): this {
    return this._formatRegex('numeric', /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i, message);
  }

  static coerce(): StringSchema<unknown> {
    return new StringSchema().preprocess((v: unknown) => (v == null ? v : String(v)));
  }
}
