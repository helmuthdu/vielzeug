import type { AnySchema, MessageFn, SchemaDescriptor } from '../core';

import { ErrorCode, Schema, fail, resolveMessage } from '../core';
import {
  isBase64,
  isBase64url,
  isCuid,
  isCuid2,
  isDuration,
  isEmail,
  isEmoji,
  isHex,
  isHexColor,
  isIp,
  isIsoDate,
  isIsoDateTime,
  isJwt,
  isNanoid,
  isNumeric,
  isSemver,
  isSlug,
  isTime,
  isUlid,
  isUrl,
  isUuid,
} from '../formats';
import { _messages, _warn } from '../messages';

/* -------------------- Typed annotations -------------------- */

interface StringAnnotations extends Record<string, unknown> {
  contentEncoding?: string;
  format?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string | null;
}

type UrlOptions = {
  message?: MessageFn<{ value: string }>;
  protocols?: readonly string[];
};

export class StringSchema<Input = string> extends Schema<string, Input> {
  constructor() {
    super((value) => (typeof value === 'string' ? null : fail(ErrorCode.invalid_type, _messages().string.type())));
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
        minLength: ann.minLength === undefined ? length : Math.max(ann.minLength, length),
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
        maxLength: ann.maxLength === undefined ? length : Math.min(ann.maxLength, length),
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
      (ann) => ({ ...ann, minLength: Math.max(ann.minLength ?? 0, 1) }),
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
        if (ann.pattern === null) return ann; // already ambiguous

        if (ann.pattern === undefined) return { ...ann, pattern: pattern.source };

        if (ann.pattern !== pattern.source) {
          _warn(
            '[spell] Multiple .regex() constraints detected on a single string schema. ' +
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
        if (isEmail(value as string)) return null;

        return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'email' });
      },
      (ann) => ({ ...ann, format: 'email' }),
    );
  }

  url(options: UrlOptions = {}): this {
    const { message = () => _messages().string.url(), protocols = ['http', 'https'] } = options;

    return this._addConstraint(
      (value) => {
        if (isUrl(value as string, protocols)) return null;

        return fail(ErrorCode.invalid_url, resolveMessage(message, { value: value as string }), { format: 'url' });
      },
      (ann) => ({ ...ann, format: 'uri' }),
    );
  }

  uuid(message: MessageFn<{ value: string }> = () => _messages().string.uuid()): this {
    return this._addConstraint(
      (value) => {
        if (isUuid(value as string)) return null;

        return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'uuid' });
      },
      (ann) => ({ ...ann, format: 'uuid' }),
    );
  }

  isoDate(message: MessageFn<{ value: string }> = () => _messages().string.date()): this {
    return this._addConstraint(
      (value) => {
        if (isIsoDate(value as string)) return null;

        return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), {
          format: 'iso-date',
        });
      },
      (ann) => ({ ...ann, format: 'date' }),
    );
  }

  isoDateTime(message: MessageFn<{ value: string }> = () => _messages().string.dateTime()): this {
    return this._addConstraint(
      (value) => {
        if (isIsoDateTime(value as string)) return null;

        return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), {
          format: 'iso-datetime',
        });
      },
      (ann) => ({ ...ann, format: 'date-time' }),
    );
  }

  ip(message: MessageFn<{ value: string }> = () => _messages().string.ip()): this {
    return this._addConstraint((value) => {
      if (isIp(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'ip' });
    });
  }

  cuid(message: MessageFn<{ value: string }> = () => _messages().string.cuid()): this {
    return this._addConstraint((value) => {
      if (isCuid(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'cuid' });
    });
  }

  cuid2(message: MessageFn<{ value: string }> = () => _messages().string.cuid2()): this {
    return this._addConstraint((value) => {
      if (isCuid2(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'cuid2' });
    });
  }

  ulid(message: MessageFn<{ value: string }> = () => _messages().string.ulid()): this {
    return this._addConstraint((value) => {
      if (isUlid(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'ulid' });
    });
  }

  nanoid(message: MessageFn<{ value: string }> = () => _messages().string.nanoid()): this {
    return this._addConstraint((value) => {
      if (isNanoid(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'nanoid' });
    });
  }

  base64(message: MessageFn<{ value: string }> = () => _messages().string.base64()): this {
    return this._addConstraint(
      (value) => {
        if (isBase64(value as string)) return null;

        return fail(ErrorCode.invalid_base64, resolveMessage(message, { value: value as string }), {
          format: 'base64',
        });
      },
      (ann) => ({ ...ann, contentEncoding: 'base64' }),
    );
  }

  base64url(message: MessageFn<{ value: string }> = () => _messages().string.base64url()): this {
    return this._addConstraint((value) => {
      if (isBase64url(value as string)) return null;

      return fail(ErrorCode.invalid_base64, resolveMessage(message, { value: value as string }), {
        format: 'base64url',
      });
    });
  }

  hex(message: MessageFn<{ value: string }> = () => _messages().string.hex()): this {
    return this._addConstraint((value) => {
      if (isHex(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'hex' });
    });
  }

  hexColor(message: MessageFn<{ value: string }> = () => _messages().string.hexColor()): this {
    return this._addConstraint((value) => {
      if (isHexColor(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), {
        format: 'hex-color',
      });
    });
  }

  emoji(message: MessageFn<{ value: string }> = () => _messages().string.emoji()): this {
    return this._addConstraint((value) => {
      if (isEmoji(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'emoji' });
    });
  }

  jwt(message: MessageFn<{ value: string }> = () => _messages().string.jwt()): this {
    return this._addConstraint((value) => {
      if (isJwt(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'jwt' });
    });
  }

  time(message: MessageFn<{ value: string }> = () => _messages().string.time()): this {
    return this._addConstraint((value) => {
      if (isTime(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'time' });
    });
  }

  duration(message: MessageFn<{ value: string }> = () => _messages().string.duration()): this {
    return this._addConstraint(
      (value) => {
        if (isDuration(value as string)) return null;

        return fail(ErrorCode.invalid_duration, resolveMessage(message, { value: value as string }), {
          format: 'duration',
        });
      },
      (ann) => ({ ...ann, format: 'duration' }),
    );
  }

  semver(message: MessageFn<{ value: string }> = () => _messages().string.semver()): this {
    return this._addConstraint((value) => {
      if (isSemver(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'semver' });
    });
  }

  slug(message: MessageFn<{ value: string }> = () => _messages().string.slug()): this {
    return this._addConstraint((value) => {
      if (isSlug(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'slug' });
    });
  }

  numeric(message: MessageFn<{ value: string }> = () => _messages().string.numeric()): this {
    return this._addConstraint((value) => {
      if (isNumeric(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'numeric' });
    });
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

  protected override _toSchemaBase(): Record<string, unknown> {
    const ann = this._annotations;
    const base: Record<string, unknown> = { type: 'string' };

    if (ann.minLength !== undefined) base['minLength'] = ann.minLength;

    if (ann.maxLength !== undefined) base['maxLength'] = ann.maxLength;

    if (ann.pattern != null) base['pattern'] = ann.pattern;

    if (ann.format !== undefined) base['format'] = ann.format;

    if (ann.contentEncoding !== undefined) base['contentEncoding'] = ann.contentEncoding;

    return base;
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    if (visitor.string) return visitor.string(this);

    return super._walk(visitor);
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    const ann = this._annotations;

    return {
      ...this._describeBase(),
      ...(ann.contentEncoding !== undefined ? { contentEncoding: ann.contentEncoding } : {}),
      ...(ann.format !== undefined ? { format: ann.format } : {}),
      ...(ann.maxLength !== undefined ? { maxLength: ann.maxLength } : {}),
      ...(ann.minLength !== undefined ? { minLength: ann.minLength } : {}),
      ...(ann.pattern !== undefined ? { pattern: ann.pattern } : {}),
      kind: 'string',
    };
  }

  protected override _equalsImpl(other: AnySchema): boolean {
    if (!(other instanceof StringSchema)) return false;

    return this._annotationsEqual(other);
  }

  static coerce(): StringSchema<unknown> {
    return new StringSchema().preprocess((v: unknown) => (v == null ? v : String(v)));
  }
}
