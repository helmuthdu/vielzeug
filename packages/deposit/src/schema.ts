import type { Schema } from './types';

/* -------------------- Schema Factory -------------------- */

/**
 * Helper to create a type-safe schema definition with clean syntax.
 * @example
 * ```ts
 * const schema = defineSchema<{ users: User; posts: Post }>({
 *   users: { key: 'id', indexes: ['name', 'email'] },
 *   posts: { key: 'id' }
 * });
 * ```
 */
export function defineSchema<S extends Record<string, Record<string, unknown>>>(schema: {
  [K in keyof S]: { indexes?: (keyof S[K] & string)[]; key: keyof S[K] & string };
}): Schema<S> {
  return schema as unknown as Schema<S>;
}

/**
 * Returns the IDB key path for a given field name, accounting for the internal
 * envelope format used by deposit (`{ v: record, exp?: number }`).
 *
 * Use this in `migrationFn` when creating indexes or accessing object-store key paths,
 * so your migration code stays decoupled from deposit's storage internals.
 *
 * @example
 * ```ts
 * const migrationFn: MigrationFn = (db, oldVersion, _newVersion, tx) => {
 *   if (oldVersion < 2) {
 *     tx.objectStore('users').createIndex('email', storeField('email'), { unique: true });
 *   }
 * };
 * ```
 */
export function storeField(field: string): string {
  return `v.${field}`;
}
