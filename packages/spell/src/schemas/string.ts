import { warn } from '../_dev';
import type { MessageFn, SchemaDescriptor } from '../core';
import { ErrorCode, fail, resolveMessage, Schema } from '../core';
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

export class StringSchema<Input = string, Mode extends import('../core').SchemaMode = 'sync'> extends Schema<
  string,
  Input,
  Mode
> {
  protected override get _kind(): string {
    return 'string';
  }

  override checkAsync(
    this: StringSchema<Input, 'sync'>,
    fn: (value: string, ctx: import('../core').CheckContext) => Promise<import('../core').ValidateResult>,
  ): StringSchema<Input, 'async'> {
    return this._addCheck(fn, true) as unknown as StringSchema<Input, 'async'>;
  }

  constructor() {
    super((value, ctx) =>
      typeof value === 'string' ? null : fail(ErrorCode.invalid_type, ctx!.messages.string.type()),
    );
  }

  min(length: number, message?: MessageFn<{ min: number; value: string }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if ((value as string).length >= length) return null;

        return fail(
          ErrorCode.too_small,
          resolveMessage(message ?? ctx!.messages.string.min, { min: length, value: value as string }),
          {
            min: length,
          },
        );
      },
      (current) => {
        const ann = current as StringAnnotations;

        return {
          ...ann,
          minLength: ann.minLength === undefined ? length : Math.max(ann.minLength, length),
        };
      },
    );
  }

  max(length: number, message?: MessageFn<{ max: number; value: string }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if ((value as string).length <= length) return null;

        return fail(
          ErrorCode.too_big,
          resolveMessage(message ?? ctx!.messages.string.max, { max: length, value: value as string }),
          {
            max: length,
          },
        );
      },
      (current) => {
        const ann = current as StringAnnotations;

        return {
          ...ann,
          maxLength: ann.maxLength === undefined ? length : Math.min(ann.maxLength, length),
        };
      },
    );
  }

  length(exact: number, message?: MessageFn<{ exact: number; value: string }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if ((value as string).length === exact) return null;

        return fail(
          ErrorCode.invalid_length,
          resolveMessage(message ?? ctx!.messages.string.length, { exact, value: value as string }),
          { exact },
        );
      },
      (ann) => ({ ...ann, maxLength: exact, minLength: exact }),
    );
  }

  /**
   * Alias for `.nonEmpty()` — validates that the string is not empty.
   * Provided for discoverability alongside `ArraySchema.nonEmpty()`.
   */
  nonempty(message?: MessageFn<{ min: number; value: string }>): this {
    return this.nonEmpty(message);
  }

  nonEmpty(message?: MessageFn<{ min: number; value: string }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if ((value as string).length > 0) return null;

        return fail(
          ErrorCode.too_small,
          resolveMessage(message ?? ctx!.messages.string.nonEmpty, { min: 1, value: value as string }),
          { min: 1 },
        );
      },
      (current) => {
        const ann = current as StringAnnotations;

        return { ...ann, minLength: Math.max(ann.minLength ?? 0, 1) };
      },
    );
  }

  startsWith(prefix: string, message?: MessageFn<{ prefix: string; value: string }>): this {
    return this._addConstraint((value, ctx) => {
      if ((value as string).startsWith(prefix)) return null;

      return fail(
        ErrorCode.invalid_string,
        resolveMessage(message ?? ctx!.messages.string.startsWith, { prefix, value: value as string }),
        { prefix },
      );
    });
  }

  endsWith(suffix: string, message?: MessageFn<{ suffix: string; value: string }>): this {
    return this._addConstraint((value, ctx) => {
      if ((value as string).endsWith(suffix)) return null;

      return fail(
        ErrorCode.invalid_string,
        resolveMessage(message ?? ctx!.messages.string.endsWith, { suffix, value: value as string }),
        { suffix },
      );
    });
  }

  includes(substr: string, message?: MessageFn<{ substr: string; value: string }>): this {
    return this._addConstraint((value, ctx) => {
      if ((value as string).includes(substr)) return null;

      return fail(
        ErrorCode.invalid_string,
        resolveMessage(message ?? ctx!.messages.string.includes, { substr, value: value as string }),
        {
          includes: substr,
        },
      );
    });
  }

  /**
   * Validates that the string matches the given regular expression.
   *
   * **Security note:** Stateful `/g` and `/y` flags are stripped automatically to prevent
   * `lastIndex`-based bugs. However, caller-supplied patterns with catastrophic backtracking
   * (e.g. `/(a+)+$/`) are a ReDoS risk when validating untrusted input in server-side contexts.
   * Prefer well-tested, bounded patterns for user-facing validation.
   *
   */
  regex(pattern: RegExp, message?: MessageFn<{ value: string }>): this {
    const safePattern = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));

    return this._addConstraint(
      (value, ctx) => {
        // Caller-supplied regexes still run against untrusted strings; spell can
        // neutralize stateful /g and /y flags but cannot make arbitrary patterns
        // immune to catastrophic backtracking without breaking the API.
        if (safePattern.test(value as string)) return null;

        return fail(
          ErrorCode.invalid_string,
          resolveMessage(message ?? ctx!.messages.string.regex, { value: value as string }),
          {
            pattern: safePattern.source,
          },
        );
      },
      (current) => {
        const ann = current as StringAnnotations;

        if (ann.pattern === null) return ann; // already ambiguous

        if (ann.pattern === undefined) return { ...ann, pattern: safePattern.source };

        if (ann.pattern !== safePattern.source) {
          warn(
            '[spell] Multiple .regex() constraints detected on a single string schema. ' +
              'JSON Schema `pattern` cannot represent multiple patterns and will be omitted from definition output.',
          );

          return { ...ann, pattern: null };
        }

        return ann;
      },
    );
  }

  email(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if (isEmail(value as string)) return null;

        return fail(
          ErrorCode.invalid_string,
          resolveMessage(message ?? ctx!.messages.string.email, { value: value as string }),
          { format: 'email' },
        );
      },
      (ann) => ({ ...ann, format: 'email' }),
    );
  }

  url(options: UrlOptions = {}): this {
    const { message, protocols = ['http', 'https'] } = options;

    return this._addConstraint(
      (value, ctx) => {
        if (isUrl(value as string, protocols)) return null;

        return fail(
          ErrorCode.invalid_url,
          resolveMessage(message ?? ctx!.messages.string.url, { value: value as string }),
          { format: 'url' },
        );
      },
      (ann) => ({ ...ann, format: 'uri' }),
    );
  }

  uuid(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if (isUuid(value as string)) return null;

        return fail(
          ErrorCode.invalid_string,
          resolveMessage(message ?? ctx!.messages.string.uuid, { value: value as string }),
          { format: 'uuid' },
        );
      },
      (ann) => ({ ...ann, format: 'uuid' }),
    );
  }

  isoDate(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if (isIsoDate(value as string)) return null;

        return fail(
          ErrorCode.invalid_string,
          resolveMessage(message ?? ctx!.messages.string.date, { value: value as string }),
          {
            format: 'iso-date',
          },
        );
      },
      (ann) => ({ ...ann, format: 'date' }),
    );
  }

  isoDateTime(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if (isIsoDateTime(value as string)) return null;

        return fail(
          ErrorCode.invalid_string,
          resolveMessage(message ?? ctx!.messages.string.dateTime, { value: value as string }),
          {
            format: 'iso-datetime',
          },
        );
      },
      (ann) => ({ ...ann, format: 'date-time' }),
    );
  }

  ip(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint((value, ctx) => {
      if (isIp(value as string)) return null;

      return fail(
        ErrorCode.invalid_string,
        resolveMessage(message ?? ctx!.messages.string.ip, { value: value as string }),
        { format: 'ip' },
      );
    });
  }

  cuid(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint((value, ctx) => {
      if (isCuid(value as string)) return null;

      return fail(
        ErrorCode.invalid_string,
        resolveMessage(message ?? ctx!.messages.string.cuid, { value: value as string }),
        { format: 'cuid' },
      );
    });
  }

  cuid2(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint((value, ctx) => {
      if (isCuid2(value as string)) return null;

      return fail(
        ErrorCode.invalid_string,
        resolveMessage(message ?? ctx!.messages.string.cuid2, { value: value as string }),
        { format: 'cuid2' },
      );
    });
  }

  ulid(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint((value, ctx) => {
      if (isUlid(value as string)) return null;

      return fail(
        ErrorCode.invalid_string,
        resolveMessage(message ?? ctx!.messages.string.ulid, { value: value as string }),
        { format: 'ulid' },
      );
    });
  }

  nanoid(length?: number, message?: MessageFn<{ value: string }>): this {
    return this._addConstraint((value, ctx) => {
      if (isNanoid(value as string, length)) return null;

      return fail(
        ErrorCode.invalid_string,
        resolveMessage(message ?? ctx!.messages.string.nanoid, { value: value as string }),
        { format: 'nanoid' },
      );
    });
  }

  base64(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if (isBase64(value as string)) return null;

        return fail(
          ErrorCode.invalid_base64,
          resolveMessage(message ?? ctx!.messages.string.base64, { value: value as string }),
          {
            format: 'base64',
          },
        );
      },
      (ann) => ({ ...ann, contentEncoding: 'base64' }),
    );
  }

  base64url(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint((value, ctx) => {
      if (isBase64url(value as string)) return null;

      return fail(
        ErrorCode.invalid_base64,
        resolveMessage(message ?? ctx!.messages.string.base64url, { value: value as string }),
        {
          format: 'base64url',
        },
      );
    });
  }

  hex(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint((value, ctx) => {
      if (isHex(value as string)) return null;

      return fail(
        ErrorCode.invalid_string,
        resolveMessage(message ?? ctx!.messages.string.hex, { value: value as string }),
        { format: 'hex' },
      );
    });
  }

  hexColor(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint((value, ctx) => {
      if (isHexColor(value as string)) return null;

      return fail(
        ErrorCode.invalid_string,
        resolveMessage(message ?? ctx!.messages.string.hexColor, { value: value as string }),
        {
          format: 'hex-color',
        },
      );
    });
  }

  emoji(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint((value, ctx) => {
      if (isEmoji(value as string)) return null;

      return fail(
        ErrorCode.invalid_string,
        resolveMessage(message ?? ctx!.messages.string.emoji, { value: value as string }),
        { format: 'emoji' },
      );
    });
  }

  jwt(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint((value, ctx) => {
      if (isJwt(value as string)) return null;

      return fail(
        ErrorCode.invalid_string,
        resolveMessage(message ?? ctx!.messages.string.jwt, { value: value as string }),
        { format: 'jwt' },
      );
    });
  }

  time(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint((value, ctx) => {
      if (isTime(value as string)) return null;

      return fail(
        ErrorCode.invalid_string,
        resolveMessage(message ?? ctx!.messages.string.time, { value: value as string }),
        { format: 'time' },
      );
    });
  }

  duration(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if (isDuration(value as string)) return null;

        return fail(
          ErrorCode.invalid_duration,
          resolveMessage(message ?? ctx!.messages.string.duration, { value: value as string }),
          {
            format: 'duration',
          },
        );
      },
      (ann) => ({ ...ann, format: 'duration' }),
    );
  }

  semver(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint((value, ctx) => {
      if (isSemver(value as string)) return null;

      return fail(
        ErrorCode.invalid_string,
        resolveMessage(message ?? ctx!.messages.string.semver, { value: value as string }),
        { format: 'semver' },
      );
    });
  }

  slug(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint((value, ctx) => {
      if (isSlug(value as string)) return null;

      return fail(
        ErrorCode.invalid_string,
        resolveMessage(message ?? ctx!.messages.string.slug, { value: value as string }),
        { format: 'slug' },
      );
    });
  }

  numeric(message?: MessageFn<{ value: string }>): this {
    return this._addConstraint((value, ctx) => {
      if (isNumeric(value as string)) return null;

      return fail(
        ErrorCode.invalid_string,
        resolveMessage(message ?? ctx!.messages.string.numeric, { value: value as string }),
        { format: 'numeric' },
      );
    });
  }

  /**
   * Returns a new schema that coerces the input to a string via `String(value)` before validation.
   * `null` and `undefined` are passed through unchanged.
   *
   * Equivalent to `s.coerce.string()`.
   */
  coerce(): StringSchema<unknown> {
    return StringSchema.coerce();
  }

  /**
   * **Note:** `trim()` adds a preprocessor. Preprocessors are not serializable —
   * `definition()` throws because preprocessors are not serializable.
   */
  trim(): this {
    return this.preprocess((v: unknown) => (typeof v === 'string' ? v.trim() : v));
  }

  /**
   * **Note:** `lowercase()` adds a preprocessor. Preprocessors are not serializable —
   * `definition()` throws because preprocessors are not serializable.
   */
  lowercase(): this {
    return this.preprocess((v: unknown) => (typeof v === 'string' ? v.toLowerCase() : v));
  }

  /**
   * **Note:** `uppercase()` adds a preprocessor. Preprocessors are not serializable —
   * `definition()` throws because preprocessors are not serializable.
   */
  uppercase(): this {
    return this.preprocess((v: unknown) => (typeof v === 'string' ? v.toUpperCase() : v));
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    if (visitor.string) return visitor.string(this);

    return super._walk(visitor);
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    const ann = this._annotations as StringAnnotations;

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

  static coerce(): StringSchema<unknown> {
    return new StringSchema().preprocess((v: unknown) => (v == null ? v : String(v)));
  }
}
