import type { ParseContext, ParseValue, SchemaDescriptor, SchemaState } from '../core';

import { Schema, ValidationError, _makeCtx } from '../core';

export class LazySchema<T> extends Schema<T> {
  private readonly _getter: () => Schema<T, any>;
  private _resolved?: Schema<T, any>;

  protected override get _kind(): string {
    return 'lazy';
  }

  constructor(getter: () => Schema<T, any>) {
    super();
    this._getter = getter;
  }

  private _resolve(): Schema<T, any> {
    return (this._resolved ??= this._getter());
  }

  protected override _parse(value: unknown, ctx: ParseContext): ParseValue {
    const result = this._resolve()._parseFullSync(value, ctx);

    if (result.issues.length === 0) return { data: result.data, issues: [], typeOk: true };

    return { data: value, issues: result.issues, typeOk: true };
  }

  override async parseAsync(value: unknown, ctx?: ParseContext): Promise<T> {
    const c = ctx ?? _makeCtx();

    return this._withCatchAsync(async () => {
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as T;

      const result = await this._resolve()._parseFullAsync(prepared.value, c);

      if (result.issues.length > 0) throw new ValidationError(result.issues);

      const validationIssues = await this._runValidatorsAsync(result.data, c);

      if (validationIssues.length > 0) throw new ValidationError(validationIssues);

      return this._runPostprocessors(result.data) as T;
    });
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'lazy' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
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
