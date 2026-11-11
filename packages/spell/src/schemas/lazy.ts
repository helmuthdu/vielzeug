import { chain, invalid, type MaybePromise, ok, type ParseValue, type RunContext } from '../_parse';
import { Schema } from '../schema';
import type { AnySchema, SchemaDescriptor, SchemaKind } from '../types';

/** Defers schema construction to the first parse, enabling recursive schemas. */
export class LazySchema<Output, Input = Output> extends Schema<Output, Input> {
  private readonly _getter: () => AnySchema;
  private _resolved?: AnySchema;

  constructor(getter: () => AnySchema) {
    super();
    this._getter = getter;
  }

  override get kind(): SchemaKind {
    return 'lazy';
  }

  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    this._resolved ??= this._getter();

    return chain(this._resolved._run(value, ctx), (result) =>
      result.issues.length === 0 ? ok(result.value) : invalid(value, ...result.issues),
    );
  }

  /** Recursive structure has no finite descriptor; describes as `{ kind: 'lazy' }`. */
  protected override _describe(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'lazy' };
  }
}
