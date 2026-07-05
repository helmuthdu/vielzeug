import type { AnySchema, MessageFn, SchemaDescriptor } from '../core';

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
import { _messages, _dev } from '../messages';

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
  protected override get _kind(): string {
    return 'string';
  }

  constructor() {
    super((value, ctx) =>
      typeof value === 'string' ? null : fail(ErrorCode.invalid_type, (ctx?.messages ?? _messages()).string.type()),
    );
  }

  min(length: number, message: MessageFn<{ min: number; value: string }> = (ctx) => _messages().string.min(ctx)): this {
    return this._addConstraint(
      (value, _ctx) => {
        if ((value as string).length >= length) return null;

        return fail(ErrorCode.too_small, resolveMessage(message, { min: length, value: value as string }), {
          min: length,
        });
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

  max(length: number, message: MessageFn<{ max: number; value: string }> = (ctx) => _messages().string.max(ctx)): this {
    return this._addConstraint(
      (value, _ctx) => {
        if ((value as string).length <= length) return null;

        return fail(ErrorCode.too_big, resolveMessage(message, { max: length, value: value as string }), {
          max: length,
        });
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

  length(
    exact: number,
    message: MessageFn<{ exact: number; value: string }> = (ctx) => _messages().string.length(ctx),
  ): this {
    return this._addConstraint(
      (value, _ctx) => {
        if ((value as string).length === exact) return null;

        return fail(ErrorCode.invalid_length, resolveMessage(message, { exact, value: value as string }), { exact });
      },
      (ann) => ({ ...ann, maxLength: exact, minLength: exact }),
    );
  }

  /**
   * Alias for `.nonEmpty()` — validates that the string is not empty.
   * Provided for discoverability alongside `ArraySchema.nonEmpty()`.
   */
  nonempty(message: MessageFn<{ min: number; value: string }> = () => _messages().string.nonEmpty()): this {
    return this.nonEmpty(message);
  }

  nonEmpty(message: MessageFn<{ min: number; value: string }> = () => _messages().string.nonEmpty()): this {
    return this._addConstraint(
      (value, _ctx) => {
        if ((value as string).length > 0) return null;

        return fail(ErrorCode.too_small, resolveMessage(message, { min: 1, value: value as string }), { min: 1 });
      },
      (current) => {
        const ann = current as StringAnnotations;

        return { ...ann, minLength: Math.max(ann.minLength ?? 0, 1) };
      },
    );
  }

  startsWith(
    prefix: string,
    message: MessageFn<{ prefix: string; value: string }> = (ctx) => _messages().string.startsWith(ctx),
  ): this {
    return this._addConstraint((value, _ctx) => {
      if ((value as string).startsWith(prefix)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { prefix, value: value as string }), { prefix });
    });
  }

  endsWith(
    suffix: string,
    message: MessageFn<{ suffix: string; value: string }> = (ctx) => _messages().string.endsWith(ctx),
  ): this {
    return this._addConstraint((value, _ctx) => {
      if ((value as string).endsWith(suffix)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { suffix, value: value as string }), { suffix });
    });
  }

  includes(
    substr: string,
    message: MessageFn<{ substr: string; value: string }> = (ctx) => _messages().string.includes(ctx),
  ): this {
    return this._addConstraint((value, _ctx) => {
      if ((value as string).includes(substr)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { substr, value: value as string }), {
        includes: substr,
      });
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
   * **`.equals()` note:** `.equals()` only compares descriptor-level annotations, never runtime
   * validator behavior. Chaining more than one `.regex()` collapses the descriptor `pattern` to
   * `null` (ambiguous), so two schemas with *different* pairs of regexes can compare equal even
   * though they accept different strings. This mirrors `.equals()`'s general limitation of
   * ignoring custom `.validate()`/`.refine()` logic — avoid relying on `.equals()` for schemas
   * with more than one `.regex()` constraint.
   */
  regex(pattern: RegExp, message: MessageFn<{ value: string }> = (ctx) => _messages().string.regex(ctx)): this {
    const safePattern = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));

    return this._addConstraint(
      (value, _ctx) => {
        // Caller-supplied regexes still run against untrusted strings; spell can
        // neutralize stateful /g and /y flags but cannot make arbitrary patterns
        // immune to catastrophic backtracking without breaking the API.
        if (safePattern.test(value as string)) return null;

        return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), {
          pattern: safePattern.source,
        });
      },
      (current) => {
        const ann = current as StringAnnotations;

        if (ann.pattern === null) return ann; // already ambiguous

        if (ann.pattern === undefined) return { ...ann, pattern: safePattern.source };

        if (ann.pattern !== safePattern.source) {
          _dev(
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
      (value, _ctx) => {
        if (isEmail(value as string)) return null;

        return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'email' });
      },
      (ann) => ({ ...ann, format: 'email' }),
    );
  }

  url(options: UrlOptions = {}): this {
    const { message = () => _messages().string.url(), protocols = ['http', 'https'] } = options;

    return this._addConstraint(
      (value, _ctx) => {
        if (isUrl(value as string, protocols)) return null;

        return fail(ErrorCode.invalid_url, resolveMessage(message, { value: value as string }), { format: 'url' });
      },
      (ann) => ({ ...ann, format: 'uri' }),
    );
  }

  uuid(message: MessageFn<{ value: string }> = () => _messages().string.uuid()): this {
    return this._addConstraint(
      (value, _ctx) => {
        if (isUuid(value as string)) return null;

        return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'uuid' });
      },
      (ann) => ({ ...ann, format: 'uuid' }),
    );
  }

  isoDate(message: MessageFn<{ value: string }> = () => _messages().string.date()): this {
    return this._addConstraint(
      (value, _ctx) => {
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
      (value, _ctx) => {
        if (isIsoDateTime(value as string)) return null;

        return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), {
          format: 'iso-datetime',
        });
      },
      (ann) => ({ ...ann, format: 'date-time' }),
    );
  }

  ip(message: MessageFn<{ value: string }> = () => _messages().string.ip()): this {
    return this._addConstraint((value, _ctx) => {
      if (isIp(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'ip' });
    });
  }

  cuid(message: MessageFn<{ value: string }> = () => _messages().string.cuid()): this {
    return this._addConstraint((value, _ctx) => {
      if (isCuid(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'cuid' });
    });
  }

  cuid2(message: MessageFn<{ value: string }> = () => _messages().string.cuid2()): this {
    return this._addConstraint((value, _ctx) => {
      if (isCuid2(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'cuid2' });
    });
  }

  ulid(message: MessageFn<{ value: string }> = () => _messages().string.ulid()): this {
    return this._addConstraint((value, _ctx) => {
      if (isUlid(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'ulid' });
    });
  }

  nanoid(length?: number, message: MessageFn<{ value: string }> = () => _messages().string.nanoid()): this {
    return this._addConstraint((value, _ctx) => {
      if (isNanoid(value as string, length)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'nanoid' });
    });
  }

  base64(message: MessageFn<{ value: string }> = () => _messages().string.base64()): this {
    return this._addConstraint(
      (value, _ctx) => {
        if (isBase64(value as string)) return null;

        return fail(ErrorCode.invalid_base64, resolveMessage(message, { value: value as string }), {
          format: 'base64',
        });
      },
      (ann) => ({ ...ann, contentEncoding: 'base64' }),
    );
  }

  base64url(message: MessageFn<{ value: string }> = () => _messages().string.base64url()): this {
    return this._addConstraint((value, _ctx) => {
      if (isBase64url(value as string)) return null;

      return fail(ErrorCode.invalid_base64, resolveMessage(message, { value: value as string }), {
        format: 'base64url',
      });
    });
  }

  hex(message: MessageFn<{ value: string }> = () => _messages().string.hex()): this {
    return this._addConstraint((value, _ctx) => {
      if (isHex(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'hex' });
    });
  }

  hexColor(message: MessageFn<{ value: string }> = () => _messages().string.hexColor()): this {
    return this._addConstraint((value, _ctx) => {
      if (isHexColor(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), {
        format: 'hex-color',
      });
    });
  }

  emoji(message: MessageFn<{ value: string }> = () => _messages().string.emoji()): this {
    return this._addConstraint((value, _ctx) => {
      if (isEmoji(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'emoji' });
    });
  }

  jwt(message: MessageFn<{ value: string }> = () => _messages().string.jwt()): this {
    return this._addConstraint((value, _ctx) => {
      if (isJwt(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'jwt' });
    });
  }

  time(message: MessageFn<{ value: string }> = () => _messages().string.time()): this {
    return this._addConstraint((value, _ctx) => {
      if (isTime(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'time' });
    });
  }

  duration(message: MessageFn<{ value: string }> = () => _messages().string.duration()): this {
    return this._addConstraint(
      (value, _ctx) => {
        if (isDuration(value as string)) return null;

        return fail(ErrorCode.invalid_duration, resolveMessage(message, { value: value as string }), {
          format: 'duration',
        });
      },
      (ann) => ({ ...ann, format: 'duration' }),
    );
  }

  semver(message: MessageFn<{ value: string }> = () => _messages().string.semver()): this {
    return this._addConstraint((value, _ctx) => {
      if (isSemver(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'semver' });
    });
  }

  slug(message: MessageFn<{ value: string }> = () => _messages().string.slug()): this {
    return this._addConstraint((value, _ctx) => {
      if (isSlug(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'slug' });
    });
  }

  numeric(message: MessageFn<{ value: string }> = () => _messages().string.numeric()): this {
    return this._addConstraint((value, _ctx) => {
      if (isNumeric(value as string)) return null;

      return fail(ErrorCode.invalid_string, resolveMessage(message, { value: value as string }), { format: 'numeric' });
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
   * `toDescriptor()` will warn if preprocessors are present.
   */
  trim(): this {
    return this.preprocess((v: unknown) => (typeof v === 'string' ? v.trim() : v));
  }

  /**
   * **Note:** `lowercase()` adds a preprocessor. Preprocessors are not serializable —
   * `toDescriptor()` will warn if preprocessors are present.
   */
  lowercase(): this {
    return this.preprocess((v: unknown) => (typeof v === 'string' ? v.toLowerCase() : v));
  }

  /**
   * **Note:** `uppercase()` adds a preprocessor. Preprocessors are not serializable —
   * `toDescriptor()` will warn if preprocessors are present.
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

  protected override _equalsImpl(other: AnySchema): boolean {
    if (!(other instanceof StringSchema)) return false;

    return this._annotationsEqual(other);
  }

  static coerce(): StringSchema<unknown> {
    return new StringSchema().preprocess((v: unknown) => (v == null ? v : String(v)));
  }
}
