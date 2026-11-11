import { defineOwnProperty, isUnsafeObjectKey } from '../_object';
import {
  all,
  chain,
  invalid,
  issue,
  type MaybePromise,
  type ParseValue,
  prefixIssues,
  type RunContext,
} from '../_parse';
import { Schema } from '../schema';
import {
  type AnySchema,
  ErrorCode,
  type InferInput,
  type InferOutput,
  type Issue,
  type SchemaDescriptor,
  type SchemaKind,
} from '../types';

export class RecordSchema<K extends AnySchema, V extends AnySchema> extends Schema<
  Record<InferOutput<K> & string, InferOutput<V>>,
  Record<InferInput<K> & string, InferInput<V>>
> {
  readonly keySchema: K;
  readonly valueSchema: V;

  constructor(keySchema: K, valueSchema: V) {
    super();
    this.keySchema = keySchema;
    this.valueSchema = valueSchema;
  }

  override get kind(): SchemaKind {
    return 'record';
  }

  /** Parses every own enumerable key and value; keys like `__proto__` are dropped from the output. */
  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return invalid(value, issue(ErrorCode.invalid_type, ctx.messages.object.type()));
    }

    const input = value as Record<string, unknown>;
    const keys = Object.keys(input);
    const runs = keys.map((key) => all([this.keySchema._run(key, ctx), this.valueSchema._run(input[key], ctx)]));

    return chain(all(runs), (results) => {
      const issues: Issue[] = [];
      const output: Record<string, unknown> = {};

      results.forEach(([key, entry], index) => {
        const rawKey = keys[index]!;

        if (key!.issues.length > 0) {
          issues.push(...prefixIssues(key!.issues, rawKey));
          return;
        }

        if (entry!.issues.length > 0) {
          issues.push(...prefixIssues(entry!.issues, rawKey));
          return;
        }

        const parsedKey = String(key!.value);

        if (!isUnsafeObjectKey(parsedKey)) defineOwnProperty(output, parsedKey, entry!.value);
      });

      return { issues, typeOk: true, value: output };
    });
  }

  protected override _describe(): SchemaDescriptor {
    return {
      ...this._describeBase(),
      key: this.keySchema.definition(),
      kind: 'record',
      value: this.valueSchema.definition(),
    };
  }
}
