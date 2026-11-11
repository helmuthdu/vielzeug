import { defineOwnProperty, isUnsafeObjectKey, objectFromEntries } from '../_object';
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
import { SpellDefinitionError } from '../errors';
import { Schema } from '../schema';
import {
  type AcceptsMissing,
  type AnySchema,
  ErrorCode,
  type InferInput,
  type InferOutput,
  type Issue,
  type SchemaDescriptor,
  type SchemaKind,
} from '../types';
import { EnumSchema } from './primitives';

export type ObjectShape = Record<string, AnySchema>;

type Simplify<T> = { [K in keyof T]: T[K] };
type OptionalInputKeys<T extends ObjectShape> = { [K in keyof T]: T[K] extends AcceptsMissing ? K : never }[keyof T];

export type InferObject<T extends ObjectShape> = { [K in keyof T]: InferOutput<T[K]> };
export type InferObjectInput<T extends ObjectShape> = Simplify<
  { [K in Exclude<keyof T, OptionalInputKeys<T>>]: InferInput<T[K]> } & {
    [K in OptionalInputKeys<T>]?: InferInput<T[K]>;
  }
>;

type Optional<S extends AnySchema> = Schema<InferOutput<S> | undefined, InferInput<S> | undefined> & AcceptsMissing;

/** How keys outside the shape are handled: `strict` rejects them, `relaxed` keeps them. */
type UnknownKeys = 'relaxed' | 'strict';

export class ObjectSchema<T extends ObjectShape> extends Schema<InferObject<T>, InferObjectInput<T>> {
  readonly shape: T;
  private readonly _unknownKeys: UnknownKeys;
  private readonly _tolerated: readonly string[];

  constructor(shape: T, unknownKeys: UnknownKeys = 'strict', tolerated: readonly string[] = []) {
    super();
    this.shape = Object.freeze(objectFromEntries(Object.entries(shape))) as T;
    this._unknownKeys = unknownKeys;
    this._tolerated = Object.freeze([...new Set(tolerated)]);
  }

  override get kind(): SchemaKind {
    return 'object';
  }

  /**
   * Field failures are reported per key and the failed keys are left out of the output, so
   * object-level checks still run and can branch on key presence.
   */
  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return invalid(value, issue(ErrorCode.invalid_type, ctx.messages.object.type()));
    }

    const input = value as Record<string, unknown>;
    const keys = Object.keys(this.shape);
    const unknownKeys = Object.keys(input).filter(
      (key) => !Object.hasOwn(this.shape, key) && !this._tolerated.includes(key),
    );

    return chain(all(keys.map((key) => this.shape[key]!._run(input[key], ctx))), (results) => {
      const issues: Issue[] = [];
      const output: Record<string, unknown> = {};

      if (unknownKeys.length > 0 && this._unknownKeys === 'strict') {
        issues.push(
          issue(ErrorCode.invalid_keys, ctx.messages.object.invalidKeys({ keys: unknownKeys }), { keys: unknownKeys }),
        );
      }

      results.forEach((result, index) => {
        const key = keys[index]!;

        if (result.issues.length > 0) issues.push(...prefixIssues(result.issues, key));
        else if (result.value !== undefined || Object.hasOwn(input, key)) defineOwnProperty(output, key, result.value);
      });

      if (this._unknownKeys === 'relaxed') {
        for (const key of unknownKeys) if (!isUnsafeObjectKey(key)) defineOwnProperty(output, key, input[key]);
      }

      return { issues, typeOk: true, value: output };
    });
  }

  /* -------------------- Unknown keys -------------------- */

  /** Keeps keys outside the shape in the output instead of rejecting them. */
  relaxed(): this {
    return this._withShape(this.shape, 'relaxed') as unknown as this;
  }

  /** Rejects keys outside the shape with `invalid_keys` (the default). */
  strict(): this {
    return this._withShape(this.shape, 'strict') as unknown as this;
  }

  /**
   * Accepts and drops the named keys, e.g. fields that records saved by an older schema version
   * still carry. Other unknown keys are handled as before.
   */
  tolerate(...keys: string[]): this {
    return this._withShape(this.shape, this._unknownKeys, [...this._tolerated, ...keys]) as unknown as this;
  }

  /* -------------------- Shape derivation -------------------- */

  extend<U extends ObjectShape>(extra: U): ObjectSchema<Simplify<Omit<T, keyof U> & U>> {
    return this._derive({ ...this.shape, ...extra }) as unknown as ObjectSchema<Simplify<Omit<T, keyof U> & U>>;
  }

  pick<K extends keyof T & string>(...keys: K[]): ObjectSchema<Pick<T, K>> {
    const shape = objectFromEntries(Object.entries(this.shape).filter(([key]) => keys.includes(key as K)));

    return this._derive(shape as Pick<T, K>);
  }

  omit<K extends keyof T & string>(...keys: K[]): ObjectSchema<Omit<T, K>> {
    const shape = objectFromEntries(Object.entries(this.shape).filter(([key]) => !keys.includes(key as K)));

    return this._derive(shape as Omit<T, K>);
  }

  /** Makes the named fields (or all fields) optional. */
  partial(): ObjectSchema<{ [K in keyof T]: Optional<T[K]> }>;
  partial<K extends keyof T & string>(...keys: K[]): ObjectSchema<Simplify<Omit<T, K> & { [P in K]: Optional<T[P]> }>>;
  partial(...keys: string[]): unknown {
    return this._derive(
      objectFromEntries(
        Object.entries(this.shape).map(([key, schema]) => [
          key,
          keys.length === 0 || keys.includes(key) ? schema.optional() : schema,
        ]),
      ),
    );
  }

  /** An enum schema of this object's keys. */
  keyof(): EnumSchema<[keyof T & string, ...(keyof T & string)[]]> {
    return new EnumSchema(Object.keys(this.shape) as [keyof T & string, ...(keyof T & string)[]]);
  }

  /**
   * Same unknown-key policy and state on a new shape.
   * @internal Also used by `discriminatedUnion()` to add the discriminator literal to a branch.
   */
  _withShape<U extends ObjectShape>(
    shape: U,
    unknownKeys: UnknownKeys = this._unknownKeys,
    tolerated: readonly string[] = this._tolerated,
  ): ObjectSchema<U> {
    const next = new ObjectSchema(shape, unknownKeys, tolerated);

    next.state = this.state;

    return next;
  }

  /** Derivations change the value type, so runtime behavior written for the old shape cannot carry over. */
  private _derive<U extends ObjectShape>(shape: U): ObjectSchema<U> {
    const { catch: fallback, default: defaultValue, preprocess, steps } = this.state;

    if (steps.length > 0 || preprocess.length > 0 || fallback || defaultValue) {
      throw new SpellDefinitionError(
        'Cannot derive a new shape from an object schema with checks, transforms, preprocessors, defaults, or catches. Derive the shape first, then add them.',
      );
    }

    return this._withShape(shape);
  }

  protected override _describe(): SchemaDescriptor {
    const fields: Record<string, SchemaDescriptor> = {};

    for (const [key, schema] of Object.entries(this.shape)) defineOwnProperty(fields, key, schema.definition());

    return {
      ...this._describeBase(),
      fields,
      kind: 'object',
      strict: this._unknownKeys === 'strict',
      ...(this._tolerated.length > 0 && { tolerated: this._tolerated }),
    };
  }
}
