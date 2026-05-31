import type { ParseValue, SchemaDescriptor, SchemaState } from '../core';

import { Schema } from '../core';

export class LazySchema<T> extends Schema<T> {
  private readonly _getter: () => Schema<T, any>;
  private _resolved?: Schema<T, any>;

  constructor(getter: () => Schema<T, any>) {
    super();
    this._getter = getter;
  }

  private _resolve(): Schema<T, any> {
    return (this._resolved ??= this._getter());
  }

  protected override _parseValueSync(value: unknown): ParseValue {
    const result = this._resolve()._parseFullSync(value);

    if (result.issues.length === 0) return { data: result.data, issues: [], typeOk: true };

    return { data: value, issues: result.issues, typeOk: true };
  }

  protected override async _parseValueAsync(value: unknown): Promise<ParseValue> {
    const result = await this._resolve().safeParseAsync(value);

    if (result.success) return { data: result.data, issues: [], typeOk: true };

    return { data: value, issues: result.error.issues, typeOk: true };
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'lazy' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    if (visitor.lazy) return visitor.lazy(this);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    // Lazy schemas are equal only if they reference the same getter function.
    if (!(other instanceof LazySchema)) return false;

    return this._getter === other._getter;
  }

  protected override _construct(state: SchemaState<any>): this {
    // Do not copy _resolved — each clone re-resolves from the getter on first use.
    const next = new LazySchema(this._getter) as this;

    next.state = state as any;

    return next;
  }
}
