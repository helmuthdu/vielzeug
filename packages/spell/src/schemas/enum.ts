import type { SchemaDescriptor, ValidateFn } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export type EnumValues = readonly [string | number, ...(string | number)[]];
type EnumType<T extends EnumValues> = T[number];

function buildEnumValidator(values: readonly unknown[]): ValidateFn {
  const set = new Set<unknown>(values);

  return (value) =>
    set.has(value)
      ? null
      : [{ code: ErrorCode.invalid_enum, message: _messages().enum.invalid({ values }), params: { values }, path: [] }];
}

export class EnumSchema<T extends EnumValues> extends Schema<EnumType<T>> {
  readonly values: T;

  constructor(values: T) {
    super(buildEnumValidator(values));
    this.values = values;
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'enum', values: this.values };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    if (visitor.enum) return visitor.enum(this);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof EnumSchema)) return false;

    return JSON.stringify(this.values) === JSON.stringify(other.values);
  }
}
