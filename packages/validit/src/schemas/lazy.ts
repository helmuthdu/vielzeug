import type { Issue } from '../core';

import { Schema } from '../core';

export class LazySchema<T> extends Schema<T> {
  private readonly getter: () => Schema<T, any, any, any>;

  constructor(getter: () => Schema<T, any, any, any>) {
    super([]);
    this.getter = getter;
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    const result = this.getter().safeParse(value);

    if (result.success) return { data: result.data, issues: [] };

    return { data: value, issues: result.error.issues };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    const result = await this.getter().safeParseAsync(value);

    if (result.success) return { data: result.data, issues: [] };

    return { data: value, issues: result.error.issues };
  }
}
