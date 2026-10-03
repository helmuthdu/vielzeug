import type { ParseContext, ParseValue, SchemaDescriptor, SchemaState } from '../core';

import { Schema } from '../core';

export class LazySchema<T, Input = T> extends Schema<T, Input> {
  private readonly _getter: () => Schema<T, Input>;
  private _resolved?: Schema<T, Input>;

  protected override get _kind(): string {
    return 'lazy';
  }

  constructor(getter: () => Schema<T, Input>) {
    super();
    this._getter = getter;
  }

  private _resolve(): Schema<T, Input> {
    const resolved = (this._resolved ??= this._getter());

    return resolved;
  }

  protected override _parse(value: unknown, ctx: ParseContext): ParseValue {
    const result = this._resolve()._parseFullSync(value, ctx);

    if (result.issues.length === 0) return { data: result.data, issues: [], typeOk: true };

    return { data: value, issues: result.issues, typeOk: true };
  }

  protected override async _parseAsync(value: unknown, ctx: ParseContext): Promise<ParseValue> {
    const result = await this._resolve()._parseFullAsync(value, ctx);

    if (result.issues.length === 0) return { data: result.data, issues: [], typeOk: true };

    return { data: value, issues: result.issues, typeOk: true };
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'lazy' };
  }

  protected override _construct(state: SchemaState<any>): this {
    // Do not copy _resolved: each clone re-resolves from the getter on first use.
    const next = new LazySchema(this._getter) as this;

    next.state = state as any;

    return next;
  }
}
