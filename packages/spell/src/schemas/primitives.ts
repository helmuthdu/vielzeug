import { invalid, issue, type MaybePromise, ok, type ParseValue, type RunContext } from '../_parse';
import { Schema } from '../schema';
import { ErrorCode, type SchemaDescriptor, type SchemaKind } from '../types';

export type LiteralValue = string | number | boolean | null | undefined;
export type EnumValues = readonly [string | number, ...(string | number)[]];

export class BooleanSchema<Input = boolean> extends Schema<boolean, Input> {
  override get kind(): SchemaKind {
    return 'boolean';
  }

  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    return typeof value === 'boolean'
      ? ok(value)
      : invalid(value, issue(ErrorCode.invalid_type, ctx.messages.boolean.type()));
  }

  protected override _describe(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'boolean' };
  }
}

export class LiteralSchema<T extends LiteralValue> extends Schema<T> {
  readonly value: T;

  constructor(value: T) {
    super();
    this.value = value;
  }

  override get kind(): SchemaKind {
    return 'literal';
  }

  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    return value === this.value
      ? ok(value)
      : invalid(
          value,
          issue(ErrorCode.invalid_literal, ctx.messages.literal.expected({ expected: this.value }), {
            expected: this.value,
          }),
        );
  }

  protected override _describe(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'literal', value: this.value };
  }
}

export class EnumSchema<T extends EnumValues> extends Schema<T[number]> {
  readonly values: T;
  private readonly _allowed: ReadonlySet<unknown>;

  constructor(values: T) {
    super();
    this.values = Object.freeze([...values]) as unknown as T;
    this._allowed = new Set(values);
  }

  override get kind(): SchemaKind {
    return 'enum';
  }

  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    return this._allowed.has(value)
      ? ok(value)
      : invalid(
          value,
          issue(ErrorCode.invalid_enum, ctx.messages.enum.invalid({ values: this.values }), { values: this.values }),
        );
  }

  protected override _describe(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'enum', values: this.values };
  }
}

export class InstanceOfSchema<T> extends Schema<T> {
  readonly cls: abstract new (
    ...args: never[]
  ) => T;

  constructor(cls: abstract new (...args: never[]) => T) {
    super();
    this.cls = cls;
  }

  override get kind(): SchemaKind {
    return 'instanceof';
  }

  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    return value instanceof this.cls
      ? ok(value)
      : invalid(value, issue(ErrorCode.invalid_type, ctx.messages.instanceof.type({ className: this.cls.name })));
  }

  protected override _describe(): SchemaDescriptor {
    return { ...this._describeBase(), className: this.cls.name, kind: 'instanceof' };
  }
}

export class NeverSchema extends Schema<never> {
  override get kind(): SchemaKind {
    return 'never';
  }

  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    return invalid(value, issue(ErrorCode.invalid_type, ctx.messages.never.invalid()));
  }

  protected override _describe(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'never' };
  }
}
