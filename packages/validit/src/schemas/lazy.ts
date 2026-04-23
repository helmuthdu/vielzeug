import type { Issue, ParseResult } from '../core';

import { Schema } from '../core';

export class LazySchema<T> extends Schema<T> {
  private readonly getter: () => Schema<T>;

  constructor(getter: () => Schema<T>) {
    super([]);
    this.getter = getter;
  }

  private _processParseResult(result: ParseResult<T>, fallback: unknown): { data: unknown; issues: Issue[] } {
    if (result.success) return { data: result.data, issues: [] };

    return { data: fallback, issues: result.error.issues };
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    return this._processParseResult(this.getter().safeParse(value), value);
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    return this._processParseResult(await this.getter().safeParseAsync(value), value);
  }
}
