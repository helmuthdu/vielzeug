import type { MessageFn, SchemaDescriptor } from '../core';

import { ErrorCode, Schema, fail, resolveMessage } from '../core';
import { _messages, _warn } from '../messages';

type UrlOptions = {
  message?: MessageFn<{ value: string }>;
  protocols?: readonly string[];
};

export class StringSchema<Input = string> extends Schema<string, Input> {
  constructor() {
    super((value) => (typeof value === 'string' ? null : fail(ErrorCode.invalid_type, _messages().string.type())));
  }

  private _checkRegex(
    format: string,
    pattern: RegExp,
    message: MessageFn<{ value: string }>,
    code: ErrorCode = ErrorCode.invalid_string,
  ): this {
    return this._addConstraint((value) => {
      if (pattern.test(value as string)) return null;

      return fail(code, resolveMessage(message, { value: value as string }), { format });
    });
  }

  min(length: number, message: MessageFn<{ min: number; value: string }> = (ctx) => _messages().string.min(ctx)): this {
    return this._addConstraint(
      (value) => {
        if ((value as string).length >= length) return null;

        return fail(ErrorCode.too_small, resolveMessage(message, { min: length, value: value as string }), {
          min: length,
        });
      },
      (ann) => ({
        ...ann,
        minLength: ann['minLength'] === undefined ? length : Math.max(ann['minLength'] as number, length),
      }),
    );
  }

  max(length: number, message: MessageFn<{ max: number; value: string }> = (ctx) => _messages().string.max(ctx)): this {
    return this._addConstraint(
      (value) => {
        if ((value as string).length <= length) return null;

        return fail(ErrorCode.too_big, resolveMessage(message, { max: length, value: value as string }), {
          max: length,
        });
      },
      (ann) => ({
        ...ann,
        maxLength: ann['maxLength'] === undefined ? length : Math.min(ann['maxLength'] as number, length),
      }),
    );
  }

  length(
    exact: number,
    message: MessageFn<{ exact: number; value: string }> = (ctx) => _messages().string.length(ctx),
  ): this {
    return this._addConstraint(
      (value) => {
        if ((value as string).length === exact) return null;

        return fail(ErrorCode.invalid_length, resolveMessage(message, { exact, value: value as string }), { exact });
      },
      (ann) => ({ ...ann, maxLength: exact, minLength: exact }),
    );
  }

  nonEmpty(message: MessageFn<{ min: number; value: string }> = () => _messages().string.nonEmpty()): this {
    return this._addConstraint(
      (value) => {
        if ((value as string).length > 0) return null;

        return fail(ErrorCode.too_small, resolveMessage(message, { min: 1, value: value as string }), { min: 1 });
      },
      (ann) => ({ ...ann, minLength: Math.max((ann['minLength'] as number | undefined) ?? 0, 1) }),
    );
  }

  startsWith(
    prefix: string,
    message: MessageFn<{ prefix: string; value: string }> = (ctx) => _messages().string.startsWith(ctx),
  ): this {
    return this._addConstraint((value) => {
      if ((value as string).startsWith(prefix)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { prefix, value: value as string }), { prefix });
    });
  }

  endsWith(
    suffix: string,
    message: MessageFn<{ suffix: string; value: string }> = (ctx) => _messages().string.endsWith(ctx),
  ): this {
    return this._addConstraint((value) => {
      if ((value as string).endsWith(suffix)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { suffix, value: value as string }), { suffix });
    });
  }

  includes(
    substr: string,
    message: MessageFn<{ substr: string; value: string }> = (ctx) => _messages().string.includes(ctx),
  ): this {
    return this._addConstraint((value) => {
      if ((value as string).includes(substr)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { substr, value: value as string }), {
        includes: substr,
      });
    });
  }

  regex(pattern: RegExp, message: MessageFn<{ value: string }> = (ctx) => _messages().string.regex(ctx)): this {
    return this._addConstraint(
      (value) => {
        if (pattern.test(value as string)) return null;

        return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), {
          pattern: pattern.source,
        });
      },
      (ann) => {
        const current = ann['pattern'];

        if (current === null) return ann; // already ambiguous

        if (current === undefined) return { ...ann, pattern: pattern.source };

        if (current !== pattern.source) {
          _warn(
            '[sieve] Multiple .regex() constraints detected on a single string schema. ' +
              'JSON Schema `pattern` cannot represent multiple patterns and will be omitted from toJsonSchema() output.',
          );

          return { ...ann, pattern: null };
        }

        return ann;
      },
    );
  }

  email(message: MessageFn<{ value: string }> = () => _messages().string.email()): this {
    return this._addConstraint(
      (value) => {
        if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value as string)) return null;

        return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'email' });
      },
      (ann) => ({ ...ann, format: 'email' }),
    );
  }

  url(options: UrlOptions = {}): this {
    const { message = () => _messages().string.url(), protocols = ['http', 'https'] } = options;
    const allowedProtocols = new Set(protocols.map((p) => p.toLowerCase()));

    return this._addConstraint(
      (value) => {
        try {
          const parsed = new URL(value as string);

          if (allowedProtocols.has(parsed.protocol.replace(':', '').toLowerCase())) return null;
        } catch {
          // invalid URL
        }

        return fail(ErrorCode.invalid_url, resolveMessage(message, { value: value as string }), { format: 'url' });
      },
      (ann) => ({ ...ann, format: 'uri' }),
    );
  }

  uuid(message: MessageFn<{ value: string }> = () => _messages().string.uuid()): this {
    return this._addConstraint(
      (value) => {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value as string)) return null;

        return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'uuid' });
      },
      (ann) => ({ ...ann, format: 'uuid' }),
    );
  }

  isoDate(message: MessageFn<{ value: string }> = () => _messages().string.date()): this {
    return this._addConstraint(
      (value) => {
        const v = value as string;

        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
          const d = new Date(v);

          if (!Number.isNaN(d.getTime()) && d.toISOString().startsWith(v)) return null;
        }

        return fail(ErrorCode.invalid_string, resolveMessage(message, { value: v }), { format: 'iso-date' });
      },
      (ann) => ({ ...ann, format: 'date' }),
    );
  }

  isoDateTime(message: MessageFn<{ value: string }> = () => _messages().string.dateTime()): this {
    return this._addConstraint(
      (value) => {
        const v = value as string;

        if (
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(v) &&
          !Number.isNaN(new Date(v).getTime())
        )
          return null;

        return fail(ErrorCode.invalid_string, resolveMessage(message, { value: v }), { format: 'iso-datetime' });
      },
      (ann) => ({ ...ann, format: 'date-time' }),
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
    return this._addConstraint((value) => {
      const v = value as string;

      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(v)) {
        if (
          v.split('.').every((o) => {
            const n = parseInt(o, 10);

            return n >= 0 && n <= 255;
          })
        )
          return null;
      } else {
        try {
          new URL(`http://[${v}]/`);

          return null;
        } catch {
          /* invalid */
        }
      }

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: v }), { format: 'ip' });
    });
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
    return this._addConstraint(
      (value) => {
        if (/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/.test(value as string))
          return null;

        return fail(ErrorCode.invalid_base64, resolveMessage(message, { value: value as string }), {
          format: 'base64',
        });
      },
      (ann) => ({ ...ann, contentEncoding: 'base64' }),
    );
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
    return this._addConstraint(
      (value) => {
        if (/^P(?=\d|T\d)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(\d+H)?(\d+M)?(\d+(?:\.\d+)?S)?)?$/.test(value as string))
          return null;

        return fail(ErrorCode.invalid_duration, resolveMessage(message, { value: value as string }), {
          format: 'duration',
        });
      },
      (ann) => ({ ...ann, format: 'duration' }),
    );
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
    const ann = this._annotations;
    const base: Record<string, unknown> = { type: 'string' };

    if (ann['minLength'] !== undefined) base['minLength'] = ann['minLength'];

    if (ann['maxLength'] !== undefined) base['maxLength'] = ann['maxLength'];

    if (ann['pattern'] != null) base['pattern'] = ann['pattern']; // null = ambiguous, omit

    if (ann['format'] !== undefined) base['format'] = ann['format'];

    if (ann['contentEncoding'] !== undefined) base['contentEncoding'] = ann['contentEncoding'];

    return base;
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    if (visitor.string) return visitor.string(this);

    return super._walk(visitor);
  }

  protected override _describeImpl(): SchemaDescriptor {
    const ann = this._annotations;

    return {
      ...(this.state.description ? { description: this.state.description } : {}),
      ...(this.state.isNullable ? { isNullable: true } : {}),
      ...(this.state.isOptional ? { isOptional: true } : {}),
      ...(ann['contentEncoding'] !== undefined ? { contentEncoding: ann['contentEncoding'] as string } : {}),
      ...(ann['format'] !== undefined ? { format: ann['format'] as string } : {}),
      ...(ann['maxLength'] !== undefined ? { maxLength: ann['maxLength'] as number } : {}),
      ...(ann['minLength'] !== undefined ? { minLength: ann['minLength'] as number } : {}),
      ...(ann['pattern'] !== undefined ? { pattern: ann['pattern'] as string | null } : {}),
      kind: 'string',
    };
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof StringSchema)) return false;

    const a = this._annotations;
    const b = other._annotations;

    return (
      a['minLength'] === b['minLength'] &&
      a['maxLength'] === b['maxLength'] &&
      a['pattern'] === b['pattern'] &&
      a['format'] === b['format'] &&
      a['contentEncoding'] === b['contentEncoding']
    );
  }

  static coerce(): StringSchema<unknown> {
    return new StringSchema().preprocess((v: unknown) => (v == null ? v : String(v)));
  }
}
