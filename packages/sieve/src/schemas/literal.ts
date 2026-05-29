import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export class LiteralSchema<T extends string | number | boolean | null | undefined> extends Schema<T> {
  readonly value: T;

  constructor(value: T) {
    super((val) =>
      val === value
        ? null
        : [
            {
              code: ErrorCode.invalid_literal,
              message: _messages().literal.expected({ expected: value }),
              params: { expected: value },
              path: [],
            },
          ],
    );
    this.value = value;
  }

  protected override _toSchemaBase(): Record<string, unknown> {
    if (this.value === null) return { type: 'null' };

    if (this.value === undefined) return {};

    return { const: this.value };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    if (visitor.literal) return visitor.literal(this);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof LiteralSchema)) return false;

    return this.value === other.value;
  }
}

/* -------------------- Raw-or-schema helpers (internal only) -------------------- */

import type { AnySchema } from '../core';

export type LiteralValue = string | number | boolean | null | undefined;
export type RawOrSchema = AnySchema | LiteralValue;
export type NormalizeItem<T> = T extends AnySchema ? T : T extends LiteralValue ? LiteralSchema<T> : never;
export type NormalizeItems<T extends readonly RawOrSchema[]> = { readonly [K in keyof T]: NormalizeItem<T[K]> };

export function normalizeToSchemas<T extends readonly RawOrSchema[]>(items: T): NormalizeItems<T> {
  return items.map((item) =>
    item instanceof Schema ? item : new LiteralSchema(item as LiteralValue),
  ) as unknown as NormalizeItems<T>;
}
