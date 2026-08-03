import type { ParseContext, ParseValue, SchemaDescriptor, SchemaState } from '../core';

import { Schema, SpellValidationError, _makeCtx } from '../core';

export class LazySchema<T, Input = T, Mode extends import('../core').SchemaMode = 'sync'> extends Schema<
  T,
  Input,
  Mode
> {
  private readonly _getter: () => Schema<T, Input, Mode>;
  private _resolved?: Schema<T, Input, Mode>;

  protected override get _kind(): string {
    return 'lazy';
  }

  override checkAsync(
    fn: (value: T, ctx: import('../core').CheckContext) => Promise<import('../core').ValidateResult>,
  ): LazySchema<T, Input, 'async'> {
    return this._addCheck(fn, true) as unknown as LazySchema<T, Input, 'async'>;
  }

  constructor(getter: () => Schema<T, Input, Mode>) {
    super();
    this._getter = getter;
  }

  private _resolve(): Schema<T, Input, Mode> {
    const resolved = (this._resolved ??= this._getter());

    return resolved;
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

      if (result.issues.length > 0) throw new SpellValidationError(result.issues);

      const validationIssues = await this._runValidatorsAsync(result.data, c);

      if (validationIssues.length > 0) throw new SpellValidationError(validationIssues);

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

  protected override _construct(state: SchemaState<any>): this {
    // Do not copy _resolved — each clone re-resolves from the getter on first use.
    const next = new LazySchema(this._getter) as this;

    next.state = state as any;

    return next;
  }
}
