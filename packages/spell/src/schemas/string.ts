import {
  atLeast,
  atMost,
  invalid,
  issue,
  type MaybePromise,
  ok,
  type ParseValue,
  type RunContext,
  resolveMessage,
} from '../_parse';
import type { Messages } from '../messages';
import * as is from '../predicates';
import { Schema } from '../schema';
import {
  ErrorCode,
  type Issue,
  type MessageFn,
  type PatternDescriptor,
  type SchemaDescriptor,
  type SchemaKind,
} from '../types';

type StringMeta = {
  formats: readonly string[];
  maxLength: number;
  minLength: number;
  patterns: readonly PatternDescriptor[];
};

type ValueMessage = MessageFn<{ value: string }>;

/** Each format is a `StringSchema` method, a `Messages['string']` key, and the issue's `params.format`. */
type StringFormat =
  | 'base64'
  | 'base64url'
  | 'cuid'
  | 'cuid2'
  | 'duration'
  | 'email'
  | 'emoji'
  | 'hex'
  | 'hexColor'
  | 'ip'
  | 'isoDate'
  | 'isoDateTime'
  | 'jwt'
  | 'nanoid'
  | 'numeric'
  | 'semver'
  | 'slug'
  | 'time'
  | 'ulid'
  | 'url'
  | 'uuid';

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class StringSchema<Input = string> extends Schema<string, Input> {
  override get kind(): SchemaKind {
    return 'string';
  }

  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    return typeof value === 'string'
      ? ok(value)
      : invalid(value, issue(ErrorCode.invalid_type, ctx.messages.string.type()));
  }

  private _format(
    format: StringFormat,
    test: (value: string) => boolean,
    message: ValueMessage | undefined,
    meta?: (current: Partial<StringMeta>) => Partial<StringMeta>,
  ): this {
    return this._refine<StringMeta>(
      test,
      (value, m) => issue(ErrorCode.invalid_format, resolveMessage(message ?? m.string[format], { value }), { format }),
      (current) => ({ ...meta?.(current), formats: [...(current.formats ?? []), format] }),
    );
  }

  private _pattern(
    test: (value: string) => boolean,
    pattern: PatternDescriptor,
    fail: (value: string, messages: Messages) => Issue,
  ): this {
    return this._refine<StringMeta>(test, fail, (current) => ({ patterns: [...(current.patterns ?? []), pattern] }));
  }

  /* -------------------- Length -------------------- */

  min(length: number, message?: MessageFn<{ min: number; value: string }>): this {
    return this._refine<StringMeta>(
      (value) => value.length >= length,
      (value, m) =>
        issue(ErrorCode.too_small, resolveMessage(message ?? m.string.min, { min: length, value }), { min: length }),
      (current) => ({ minLength: atLeast(current.minLength, length) }),
    );
  }

  max(length: number, message?: MessageFn<{ max: number; value: string }>): this {
    return this._refine<StringMeta>(
      (value) => value.length <= length,
      (value, m) =>
        issue(ErrorCode.too_big, resolveMessage(message ?? m.string.max, { max: length, value }), { max: length }),
      (current) => ({ maxLength: atMost(current.maxLength, length) }),
    );
  }

  length(exact: number, message?: MessageFn<{ exact: number; value: string }>): this {
    return this._refine<StringMeta>(
      (value) => value.length === exact,
      (value, m) =>
        issue(ErrorCode.invalid_length, resolveMessage(message ?? m.string.length, { exact, value }), { exact }),
      (current) => ({ maxLength: atMost(current.maxLength, exact), minLength: atLeast(current.minLength, exact) }),
    );
  }

  nonEmpty(message?: ValueMessage): this {
    return this._refine<StringMeta>(
      (value) => value.length > 0,
      (value, m) => issue(ErrorCode.too_small, resolveMessage(message ?? m.string.nonEmpty, { value }), { min: 1 }),
      (current) => ({ minLength: atLeast(current.minLength, 1) }),
    );
  }

  /* -------------------- Patterns -------------------- */

  startsWith(prefix: string, message?: MessageFn<{ prefix: string; value: string }>): this {
    return this._pattern(
      (value) => value.startsWith(prefix),
      { flags: '', source: `^${escapeRegExp(prefix)}` },
      (value, m) =>
        issue(ErrorCode.invalid_format, resolveMessage(message ?? m.string.startsWith, { prefix, value }), {
          format: 'startsWith',
          prefix,
        }),
    );
  }

  endsWith(suffix: string, message?: MessageFn<{ suffix: string; value: string }>): this {
    return this._pattern(
      (value) => value.endsWith(suffix),
      { flags: '', source: `${escapeRegExp(suffix)}$` },
      (value, m) =>
        issue(ErrorCode.invalid_format, resolveMessage(message ?? m.string.endsWith, { suffix, value }), {
          format: 'endsWith',
          suffix,
        }),
    );
  }

  includes(substr: string, message?: MessageFn<{ substr: string; value: string }>): this {
    return this._pattern(
      (value) => value.includes(substr),
      { flags: '', source: escapeRegExp(substr) },
      (value, m) =>
        issue(ErrorCode.invalid_format, resolveMessage(message ?? m.string.includes, { substr, value }), {
          format: 'includes',
          includes: substr,
        }),
    );
  }

  /**
   * Validates against `pattern`. Stateful `g`/`y` flags are dropped so repeated parses agree.
   *
   * **Security:** caller-supplied patterns with catastrophic backtracking (e.g. `/(a+)+$/`) are a
   * ReDoS risk on untrusted input; prefer bounded patterns.
   */
  regex(pattern: RegExp, message?: ValueMessage): this {
    const safe = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));

    return this._pattern(
      (value) => safe.test(value),
      { flags: safe.flags, source: safe.source },
      (value, m) =>
        issue(ErrorCode.invalid_format, resolveMessage(message ?? m.string.regex, { value }), {
          format: 'regex',
          pattern: safe.source,
        }),
    );
  }

  /* -------------------- Formats -------------------- */

  email(message?: ValueMessage): this {
    return this._format('email', is.isEmail, message);
  }

  /** Absolute URL whose protocol is in `protocols` (default `http`, `https`). */
  url(options: { message?: ValueMessage; protocols?: readonly string[] } = {}): this {
    const { message, protocols = ['http', 'https'] } = options;
    const pattern = { flags: 'i', source: `^(?:${protocols.map(escapeRegExp).join('|')}):` };

    return this._format(
      'url',
      (value) => is.isUrl(value, protocols),
      message,
      (current) => ({
        patterns: [...(current.patterns ?? []), pattern],
      }),
    );
  }

  uuid(message?: ValueMessage): this {
    return this._format('uuid', is.isUuid, message);
  }

  isoDate(message?: ValueMessage): this {
    return this._format('isoDate', is.isIsoDate, message);
  }

  isoDateTime(message?: ValueMessage): this {
    return this._format('isoDateTime', is.isIsoDateTime, message);
  }

  time(message?: ValueMessage): this {
    return this._format('time', is.isTime, message);
  }

  duration(message?: ValueMessage): this {
    return this._format('duration', is.isDuration, message);
  }

  ip(message?: ValueMessage): this {
    return this._format('ip', is.isIp, message);
  }

  cuid(message?: ValueMessage): this {
    return this._format('cuid', is.isCuid, message);
  }

  cuid2(message?: ValueMessage): this {
    return this._format('cuid2', is.isCuid2, message);
  }

  ulid(message?: ValueMessage): this {
    return this._format('ulid', is.isUlid, message);
  }

  /** NanoID of exactly `length` characters (default 21). */
  nanoid(length = 21, message?: ValueMessage): this {
    return this._format(
      'nanoid',
      (value) => is.isNanoid(value, length),
      message,
      (current) => ({
        maxLength: atMost(current.maxLength, length),
        minLength: atLeast(current.minLength, length),
      }),
    );
  }

  base64(message?: ValueMessage): this {
    return this._format('base64', is.isBase64, message);
  }

  base64url(message?: ValueMessage): this {
    return this._format('base64url', is.isBase64url, message);
  }

  hex(message?: ValueMessage): this {
    return this._format('hex', is.isHex, message);
  }

  hexColor(message?: ValueMessage): this {
    return this._format('hexColor', is.isHexColor, message);
  }

  emoji(message?: ValueMessage): this {
    return this._format('emoji', is.isEmoji, message);
  }

  jwt(message?: ValueMessage): this {
    return this._format('jwt', is.isJwt, message);
  }

  semver(message?: ValueMessage): this {
    return this._format('semver', is.isSemver, message);
  }

  slug(message?: ValueMessage): this {
    return this._format('slug', is.isSlug, message);
  }

  numeric(message?: ValueMessage): this {
    return this._format('numeric', is.isNumeric, message);
  }

  /* -------------------- Normalization (ordered transforms) -------------------- */
  // Constraints chained after a normalizer see the normalized value. Normalizers are
  // transforms, so `definition()` throws for schemas that use them.

  trim(): this {
    return this.transform((value) => value.trim()) as unknown as this;
  }

  lowercase(): this {
    return this.transform((value) => value.toLowerCase()) as unknown as this;
  }

  uppercase(): this {
    return this.transform((value) => value.toUpperCase()) as unknown as this;
  }

  protected override _describe(): SchemaDescriptor {
    return { ...this._describeBase(), ...(this.state.meta as Partial<StringMeta>), kind: 'string' };
  }
}
