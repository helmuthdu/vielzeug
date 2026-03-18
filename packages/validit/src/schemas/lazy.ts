import { Schema, ValidationError } from '../core';

export class LazySchema<T> extends Schema<T> {
  private readonly getter: () => Schema<T>;

  constructor(getter: () => Schema<T>) {
    super([]);
    this.getter = getter;
    // Use a single sync validator that delegates to the inner schema's sync path.
    // This lets base-class logic (optional/nullable/catch/preprocessors/etc.) work
    // on the LazySchema itself.
    this._validators = [
      (value, path) => {
        const inner = this.getter();
        const result = inner.safeParse(value);

        return result.success ? null : result.error.issues.map((i) => ({ ...i, path: [...path, ...i.path] }));
      },
    ];
  }

  override async parseAsync(value: unknown): Promise<T> {
    return this._withCatchAsync(async () => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

      if (this._isOptional && processed === undefined) return undefined as unknown as T;

      if (this._isNullable && processed === null) return null as unknown as T;

      const inner = this.getter();
      const result = await inner.safeParseAsync(processed);

      if (!result.success) {
        throw new ValidationError(result.error.issues);
      }

      const asyncIssues = await this._runAsync(result.data, []);

      if (asyncIssues.length) throw new ValidationError(asyncIssues);

      return this._postprocessors.reduce((v, fn) => fn(v), result.data) as T;
    });
  }
}

export const lazy = <T>(getter: () => Schema<T>): LazySchema<T> => new LazySchema(getter);
