import type { MessageFn } from '../core';

import { ErrorCode, Schema, fail, resolveMessage } from '../core';
import { _messages, _warn } from '../messages';

type UrlOptions = {
  message?: MessageFn<{ value: string }>;
  protocols?: readonly string[];
};

export class StringSchema<Input = string> extends Schema<string, Input> {
  /** @internal JSON Schema annotation \u2014 populated by min()/length()/nonEmpty() */
  _minLength?: number;
  /** @internal JSON Schema annotation \u2014 populated by max()/length() */
  _maxLength?: number;
  /** @internal JSON Schema annotation \u2014 populated by regex(); null = ambiguous (multiple patterns) */
  _pattern?: string | null;
  /** @internal JSON Schema annotation \u2014 populated by email/uuid/url/isoDate etc. */
  _format?: string;
  /** @internal JSON Schema annotation \u2014 populated by base64() */
  _contentEncoding?: string;

  constructor() {
    super((value) => (typeof value === 'string' ? null : fail(ErrorCode.invalid_type, _messages().string.type())));
  }

  private _check(
    format: string,
    check: (value: string) => boolean,
    message: MessageFn<{ value: string }>,
    code: ErrorCode = ErrorCode.invalid_string,
  ): this {
    return this._addValidator((value) => {
      const s = value as string;

      if (check(s)) return null;

      return fail(code, resolveMessage(message, { value: s }), { format });
    });
  }

  private _checkRegex(
    format: string,
    pattern: RegExp,
    message: MessageFn<{ value: string }>,
    code: ErrorCode = ErrorCode.invalid_string,
  ): this {
    return this._check(format, (value) => pattern.test(value), message, code);
  }

  min(length: number, message: MessageFn<{ min: number; value: string }> = (ctx) => _messages().string.min(ctx)): this {
    const next = this._addValidator((value) => {
      if ((value as string).length >= length) return null;

      return fail(ErrorCode.too_small, resolveMessage(message, { min: length, value: value as string }), {
        min: length,
      });
    }) as StringSchema<any>;

    next._minLength = next._minLength === undefined ? length : Math.max(next._minLength, length);

    return next as this;
  }

  max(length: number, message: MessageFn<{ max: number; value: string }> = (ctx) => _messages().string.max(ctx)): this {
    const next = this._addValidator((value) => {
      if ((value as string).length <= length) return null;

      return fail(ErrorCode.too_big, resolveMessage(message, { max: length, value: value as string }), { max: length });
    }) as StringSchema<any>;

    next._maxLength = next._maxLength === undefined ? length : Math.min(next._maxLength, length);

    return next as this;
  }

  length(
    exact: number,
    message: MessageFn<{ exact: number; value: string }> = (ctx) => _messages().string.length(ctx),
  ): this {
    const next = this._addValidator((value) => {
      if ((value as string).length === exact) return null;

      return fail(ErrorCode.invalid_length, resolveMessage(message, { exact, value: value as string }), { exact });
    }) as StringSchema<any>;

    next._minLength = exact;
    next._maxLength = exact;

    return next as this;
  }

  nonEmpty(message: MessageFn<{ min: number; value: string }> = () => _messages().string.nonEmpty()): this {
    const next = this._addValidator((value) => {
      if ((value as string).length > 0) return null;

      return fail(ErrorCode.too_small, resolveMessage(message, { min: 1, value: value as string }), { min: 1 });
    }) as StringSchema<any>;

    if (next._minLength === undefined || next._minLength < 1) next._minLength = 1;

    return next as this;
  }

  startsWith(
    prefix: string,
    message: MessageFn<{ prefix: string; value: string }> = (ctx) => _messages().string.startsWith(ctx),
  ): this {
    return this._addValidator((value) => {
      if ((value as string).startsWith(prefix)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { prefix, value: value as string }), { prefix });
    });
  }

  endsWith(
    suffix: string,
    message: MessageFn<{ suffix: string; value: string }> = (ctx) => _messages().string.endsWith(ctx),
  ): this {
    return this._addValidator((value) => {
      if ((value as string).endsWith(suffix)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { suffix, value: value as string }), { suffix });
    });
  }

  includes(
    substr: string,
    message: MessageFn<{ substr: string; value: string }> = (ctx) => _messages().string.includes(ctx),
  ): this {
    return this._addValidator((value) => {
      if ((value as string).includes(substr)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { substr, value: value as string }), {
        includes: substr,
      });
    });
  }

  regex(pattern: RegExp, message: MessageFn<{ value: string }> = (ctx) => _messages().string.regex(ctx)): this {
    const next = this._addValidator((value) => {
      if (pattern.test(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), {
        pattern: pattern.source,
      });
    }) as StringSchema<any>;

    if (next._pattern === null) {
      // already ambiguous, stay that way
    } else if (next._pattern === undefined) {
      next._pattern = pattern.source;
    } else if (next._pattern !== pattern.source) {
      next._pattern = null; // multiple conflicting patterns: omit from JSON Schema
      _warn(
        '[validit] Multiple .regex() constraints detected on a single string schema. ' +
          'JSON Schema `pattern` cannot represent multiple patterns and will be omitted from schema() output.',
      );
    }

    return next as this;
  }

  email(message: MessageFn<{ value: string }> = () => _messages().string.email()): this {
    const next = this._checkRegex('email', /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, message);

    (next as StringSchema<any>)._format = 'email';

    return next;
  }

  url(options: UrlOptions = {}): this {
    const { message = () => _messages().string.url(), protocols = ['http', 'https'] } = options;
    const allowedProtocols = new Set(protocols.map((p) => p.toLowerCase()));
    const next = this._check(
      'url',
      (value) => {
        try {
          const parsed = new URL(value);

          return allowedProtocols.has(parsed.protocol.replace(':', '').toLowerCase());
        } catch {
          return false;
        }
      },
      message,
      ErrorCode.invalid_url,
    );

    (next as StringSchema<any>)._format = 'uri';

    return next;
  }

  uuid(message: MessageFn<{ value: string }> = () => _messages().string.uuid()): this {
    const next = this._checkRegex('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, message);

    (next as StringSchema<any>)._format = 'uuid';

    return next;
  }

  isoDate(message: MessageFn<{ value: string }> = () => _messages().string.date()): this {
    const next = this._check(
      'iso-date',
      (value) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

        const d = new Date(value);

        return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
      },
      message,
    );

    (next as StringSchema<any>)._format = 'date';

    return next;
  }

  isoDateTime(message: MessageFn<{ value: string }> = () => _messages().string.dateTime()): this {
    const next = this._check(
      'iso-datetime',
      (value) =>
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value) &&
        !Number.isNaN(new Date(value).getTime()),
      message,
    );

    (next as StringSchema<any>)._format = 'date-time';

    return next;
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
    return this._check(
      'ip',
      (value) => {
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
          return value.split('.').every((octet) => {
            const n = parseInt(octet, 10);

            return n >= 0 && n <= 255;
          });
        }

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
    return this._checkRegex('cuid', /^c[a-z0-9]{8,}$/, message);
  }

  cuid2(message: MessageFn<{ value: string }> = () => _messages().string.cuid2()): this {
    return this._checkRegex('cuid2', /^[a-z][a-z0-9]{23}$/, message);
  }

  ulid(message: MessageFn<{ value: string }> = () => _messages().string.ulid()): this {
    return this._checkRegex('ulid', /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/, message);
  }

  nanoid(message: MessageFn<{ value: string }> = () => _messages().string.nanoid()): this {
    return this._checkRegex('nanoid', /^[A-Za-z0-9_-]{10,}$/, message);
  }

  base64(message: MessageFn<{ value: string }> = () => _messages().string.base64()): this {
    const next = this._checkRegex(
      'base64',
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/,
      message,
      ErrorCode.invalid_base64,
    );

    (next as StringSchema<any>)._contentEncoding = 'base64';

    return next;
  }

  base64url(message: MessageFn<{ value: string }> = () => _messages().string.base64url()): this {
    return this._checkRegex('base64url', /^[A-Za-z0-9_-]+$/, message, ErrorCode.invalid_base64);
  }

  hex(message: MessageFn<{ value: string }> = () => _messages().string.hex()): this {
    return this._checkRegex('hex', /^[A-Fa-f0-9]+$/, message);
  }

  hexColor(message: MessageFn<{ value: string }> = () => _messages().string.hexColor()): this {
    return this._checkRegex('hex-color', /^#(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/, message);
  }

  emoji(message: MessageFn<{ value: string }> = () => _messages().string.emoji()): this {
    return this._checkRegex('emoji', /^\p{Extended_Pictographic}+$/u, message);
  }

  jwt(message: MessageFn<{ value: string }> = () => _messages().string.jwt()): this {
    return this._checkRegex('jwt', /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, message);
  }

  time(message: MessageFn<{ value: string }> = () => _messages().string.time()): this {
    return this._checkRegex('time', /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/, message);
  }

  duration(message: MessageFn<{ value: string }> = () => _messages().string.duration()): this {
    const next = this._checkRegex(
      'duration',
      /^P(?=\d|T\d)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(\d+H)?(\d+M)?(\d+(?:\.\d+)?S)?)?$/,
      message,
      ErrorCode.invalid_duration,
    );

    (next as StringSchema<any>)._format = 'duration';

    return next;
  }

  semver(message: MessageFn<{ value: string }> = () => _messages().string.semver()): this {
    return this._checkRegex(
      'semver',
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/,
      message,
    );
  }

  slug(message: MessageFn<{ value: string }> = () => _messages().string.slug()): this {
    return this._checkRegex('slug', /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message);
  }

  numeric(message: MessageFn<{ value: string }> = () => _messages().string.numeric()): this {
    return this._checkRegex('numeric', /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i, message);
  }

  protected override _toSchemaBase(): Record<string, unknown> {
    const base: Record<string, unknown> = { type: 'string' };

    if (this._minLength !== undefined) base['minLength'] = this._minLength;

    if (this._maxLength !== undefined) base['maxLength'] = this._maxLength;

    if (this._pattern != null) base['pattern'] = this._pattern; // null = ambiguous, omit

    if (this._format !== undefined) base['format'] = this._format;

    if (this._contentEncoding !== undefined) base['contentEncoding'] = this._contentEncoding;

    return base;
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    if (visitor.string) return visitor.string(this);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof StringSchema)) return false;

    const o = other as StringSchema<any>;

    return (
      this._minLength === o._minLength &&
      this._maxLength === o._maxLength &&
      this._pattern === o._pattern &&
      this._format === o._format &&
      this._contentEncoding === o._contentEncoding
    );
  }

  static coerce(): StringSchema<unknown> {
    return new StringSchema().preprocess((v: unknown) => (v == null ? v : String(v)));
  }
}
