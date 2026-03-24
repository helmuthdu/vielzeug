import { ErrorCode, Schema } from '../core';

export class LiteralSchema<T extends string | number | boolean | null | undefined> extends Schema<T> {
  readonly value: T;

  constructor(value: T) {
    super([
      (val, path) =>
        val === value
          ? null
          : [{ code: ErrorCode.invalid_literal, message: `Expected ${JSON.stringify(value)}`, path }],
    ]);
    this.value = value;
  }
}

export const literal = <T extends string | number | boolean | null | undefined>(value: T): LiteralSchema<T> =>
  new LiteralSchema(value);

/* -------------------- Raw-or-schema helpers -------------------- */
/* Used internally by union and intersect to accept raw literal values */

export type LiteralValue = string | number | boolean | null | undefined;
export type RawOrSchema = Schema<any> | LiteralValue;
export type NormalizeItem<T> = T extends Schema<any> ? T : T extends LiteralValue ? LiteralSchema<T> : never;
export type NormalizeItems<T extends readonly RawOrSchema[]> = { readonly [K in keyof T]: NormalizeItem<T[K]> };

export function normalizeToSchemas<T extends readonly RawOrSchema[]>(items: T): NormalizeItems<T> {
  return items.map((item) =>
    item instanceof Schema ? item : new LiteralSchema(item as LiteralValue),
  ) as unknown as NormalizeItems<T>;
}
