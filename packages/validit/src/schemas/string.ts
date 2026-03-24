import type { MessageFn } from '../core';

import { ErrorCode, resolveMessage, Schema } from '../core';
import { _messages } from '../messages';

export class StringSchema extends Schema<string> {
  constructor() {
    super([
      (value, path) =>
        typeof value === 'string' ? null : [{ code: ErrorCode.invalid_type, message: _messages().string_type(), path }],
    ]);
  }

  min(length: number, message: MessageFn<{ min: number; value: string }> = (ctx) => _messages().string_min(ctx)): this {
    return this._addValidator((value, path) =>
      (value as string).length >= length
        ? null
        : [
            {
              code: ErrorCode.too_small,
              message: resolveMessage(message, { min: length, value: value as string }),
              params: { minimum: length },
              path,
            },
          ],
    );
  }

  max(length: number, message: MessageFn<{ max: number; value: string }> = (ctx) => _messages().string_max(ctx)): this {
    return this._addValidator((value, path) =>
      (value as string).length <= length
        ? null
        : [
            {
              code: ErrorCode.too_big,
              message: resolveMessage(message, { max: length, value: value as string }),
              params: { maximum: length },
              path,
            },
          ],
    );
  }

  length(
    exact: number,
    message: MessageFn<{ exact: number; value: string }> = (ctx) => _messages().string_length(ctx),
  ): this {
    return this._addValidator((value, path) =>
      (value as string).length === exact
        ? null
        : [
            {
              code: ErrorCode.invalid_length,
              message: resolveMessage(message, { exact, value: value as string }),
              params: { exact },
              path,
            },
          ],
    );
  }

  nonempty(message: MessageFn<{ min: number; value: string }> = () => _messages().string_nonempty()): this {
    return this.min(1, message);
  }

  startsWith(
    prefix: string,
    message: MessageFn<{ prefix: string; value: string }> = (ctx) => _messages().string_starts_with(ctx),
  ): this {
    return this._addValidator((value, path) =>
      (value as string).startsWith(prefix)
        ? null
        : [
            {
              code: ErrorCode.invalid_string,
              message: resolveMessage(message, { prefix, value: value as string }),
              params: { prefix },
              path,
            },
          ],
    );
  }

  endsWith(
    suffix: string,
    message: MessageFn<{ suffix: string; value: string }> = (ctx) => _messages().string_ends_with(ctx),
  ): this {
    return this._addValidator((value, path) =>
      (value as string).endsWith(suffix)
        ? null
        : [
            {
              code: ErrorCode.invalid_string,
              message: resolveMessage(message, { suffix, value: value as string }),
              params: { suffix },
              path,
            },
          ],
    );
  }

  includes(
    substr: string,
    message: MessageFn<{ substr: string; value: string }> = (ctx) => _messages().string_includes(ctx),
  ): this {
    return this._addValidator((value, path) =>
      (value as string).includes(substr)
        ? null
        : [
            {
              code: ErrorCode.invalid_string,
              message: resolveMessage(message, { substr, value: value as string }),
              params: { includes: substr },
              path,
            },
          ],
    );
  }

  regex(pattern: RegExp, message: MessageFn<{ value: string }> = (ctx) => _messages().string_regex(ctx)): this {
    return this._addValidator((value, path) =>
      pattern.test(value as string)
        ? null
        : [
            {
              code: ErrorCode.invalid_string,
              message: resolveMessage(message, { value: value as string }),
              params: { pattern: pattern.source },
              path,
            },
          ],
    );
  }

  email(message: MessageFn<{ value: string }> = () => _messages().string_email()): this {
    return this._addValidator((value, path) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string)
        ? null
        : [
            {
              code: ErrorCode.invalid_string,
              message: resolveMessage(message, { value: value as string }),
              params: { format: 'email' },
              path,
            },
          ],
    );
  }

  url(message: MessageFn<{ value: string }> = () => _messages().string_url()): this {
    return this._addValidator((value, path) => {
      try {
        new URL(value as string);

        return null;
      } catch {
        return [
          {
            code: ErrorCode.invalid_url,
            message: resolveMessage(message, { value: value as string }),
            params: { format: 'url' },
            path,
          },
        ];
      }
    });
  }

  uuid(message: MessageFn<{ value: string }> = () => _messages().string_uuid()): this {
    return this._addValidator((value, path) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value as string)
        ? null
        : [
            {
              code: ErrorCode.invalid_string,
              message: resolveMessage(message, { value: value as string }),
              params: { format: 'uuid' },
              path,
            },
          ],
    );
  }

  date(message: MessageFn<{ value: string }> = () => _messages().string_date()): this {
    return this._addValidator((value, path) => {
      const str = value as string;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return [
          {
            code: ErrorCode.invalid_string,
            message: resolveMessage(message, { value: str }),
            params: { format: 'date' },
            path,
          },
        ];
      }

      const d = new Date(str);
      // Guard against roll-over dates like 2024-02-30 → 2024-03-01
      const valid = !Number.isNaN(d.getTime()) && d.toISOString().startsWith(str);

      return valid
        ? null
        : [
            {
              code: ErrorCode.invalid_string,
              message: resolveMessage(message, { value: str }),
              params: { format: 'date' },
              path,
            },
          ];
    });
  }

  datetime(message: MessageFn<{ value: string }> = () => _messages().string_datetime()): this {
    return this._addValidator((value, path) => {
      const str = value as string;

      // Require at minimum YYYY-MM-DDTHH:MM structure before trying Date constructor
      const valid = /^\d{4}-\d{2}-\d{2}T[\d:.Z+-]+$/.test(str) && !Number.isNaN(new Date(str).getTime());

      return valid
        ? null
        : [
            {
              code: ErrorCode.invalid_string,
              message: resolveMessage(message, { value: str }),
              params: { format: 'datetime' },
              path,
            },
          ];
    });
  }

  trim(): this {
    return this._addPreprocessor((v) => (typeof v === 'string' ? v.trim() : v));
  }

  lowercase(): this {
    return this._addPreprocessor((v) => (typeof v === 'string' ? v.toLowerCase() : v));
  }

  uppercase(): this {
    return this._addPreprocessor((v) => (typeof v === 'string' ? v.toUpperCase() : v));
  }

  static coerce(): StringSchema {
    return new StringSchema()._addPreprocessor((v) => (v == null ? v : String(v)));
  }
}

export const string = (): StringSchema => new StringSchema();
export const coerceString = (): StringSchema => StringSchema.coerce();
