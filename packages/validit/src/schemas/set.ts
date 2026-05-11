import type { Issue, MessageFn, ParseResult, Schema as BaseSchema } from '../core';

import { ErrorCode, prependIssuePath, Schema } from '../core';
import { createConstraintValidator } from './constraint-factories';

export class SetSchema<T> extends Schema<Set<T>> {
  private readonly itemSchema: BaseSchema<T>;

  constructor(itemSchema: BaseSchema<T>) {
    super([]);
    this.itemSchema = itemSchema;
  }

  private _invalidSet(value: unknown): { data: unknown; issues: Issue[] } {
    return {
      data: value,
      issues: [{ code: ErrorCode.invalid_type, message: 'Expected set', path: [] }],
    };
  }

  private _mergeItemResult(parsed: Set<T>, issues: Issue[], index: number, result: ParseResult<T>): void {
    if (result.success) {
      parsed.add(result.data);
    } else {
      issues.push(...prependIssuePath(result.error.issues, index));
    }
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    if (!(value instanceof Set)) {
      return this._invalidSet(value);
    }

    const issues: Issue[] = [];
    const parsed = new Set<T>();
    let i = 0;

    for (const item of value) {
      const result = this.itemSchema.safeParse(item);

      this._mergeItemResult(parsed, issues, i, result);

      i += 1;
    }

    issues.push(...this._runCoreValidators(parsed));

    return { data: parsed, issues };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    if (!(value instanceof Set)) {
      return this._invalidSet(value);
    }

    const parsed = new Set<T>();
    const items = [...value.values()];
    const itemResults = await Promise.all(items.map((item) => this.itemSchema.safeParseAsync(item)));
    const issues: Issue[] = [];

    for (let i = 0; i < itemResults.length; i++) {
      this._mergeItemResult(parsed, issues, i, itemResults[i]);
    }

    issues.push(...this._runCoreValidators(parsed));

    return { data: parsed, issues };
  }

  min(
    size: number,
    message: MessageFn<{ min: number; value: Set<unknown> }> = ({ min }) => `Must contain at least ${min} items`,
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<Set<unknown>, { min: number; value: Set<unknown> }>({
        check: (value) => value.size >= size,
        code: ErrorCode.too_small,
        context: { min: size },
        message,
        params: { minimum: size },
      }),
    );
  }

  max(
    size: number,
    message: MessageFn<{ max: number; value: Set<unknown> }> = ({ max }) => `Must contain at most ${max} items`,
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<Set<unknown>, { max: number; value: Set<unknown> }>({
        check: (value) => value.size <= size,
        code: ErrorCode.too_big,
        context: { max: size },
        message,
        params: { maximum: size },
      }),
    );
  }

  size(
    exact: number,
    message: MessageFn<{ exact: number; value: Set<unknown> }> = ({ exact }) => `Must contain exactly ${exact} items`,
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<Set<unknown>, { exact: number; value: Set<unknown> }>({
        check: (value) => value.size === exact,
        code: ErrorCode.invalid_length,
        context: { exact },
        message,
        params: { exact },
      }),
    );
  }

  nonEmpty(message: MessageFn<{ min: number; value: Set<unknown> }> = () => 'Cannot be empty'): this {
    return this.min(1, message);
  }
}
