import type { SchemaDescriptor, ValidateFn } from '../core';

import { ErrorCode, Schema } from '../core';

export type EnumValues = readonly [string | number, ...(string | number)[]];
type EnumType<T extends EnumValues> = T[number];

function buildEnumValidator(values: readonly unknown[]): ValidateFn {
  const set = new Set<unknown>(values);

  return (value, ctx) =>
    set.has(value)
      ? null
      : [
          {
            code: ErrorCode.invalid_enum,
            message: ctx!.messages.enum.invalid({ values }),
            params: { values },
            path: [],
          },
        ];
}

export class EnumSchema<T extends EnumValues, Mode extends import('../core').SchemaMode = 'sync'> extends Schema<
  EnumType<T>,
  EnumType<T>,
  Mode
> {
  readonly values: T;

  protected override get _kind(): string {
    return 'enum';
  }

  override checkAsync(
    this: EnumSchema<T, 'sync'>,
    fn: (value: EnumType<T>, ctx: import('../core').CheckContext) => Promise<import('../core').ValidateResult>,
  ): EnumSchema<T, 'async'> {
    return this._addCheck(fn, true) as unknown as EnumSchema<T, 'async'>;
  }

  constructor(values: T) {
    super(buildEnumValidator(values));
    this.values = values;
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'enum', values: this.values };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    if (visitor.enum) return visitor.enum(this);

    return super._walk(visitor);
  }
}
