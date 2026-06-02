import type { MigrationFn } from './types';

/**
 * A single step in a typed migration definition.
 * Compose multiple steps to describe the full schema change between two versions.
 */
export type MigrationStep =
  | { field: string; table: string; type: 'addIndex' }
  | { field: string; table: string; type: 'removeIndex' }
  | { name: string; type: 'addTable' }
  | { name: string; type: 'removeTable' };

/**
 * Builds a typed `MigrationFn` from a declarative list of schema change steps.
 * Each step is applied in order and is idempotent (safe to run when the target
 * already exists or has already been removed).
 *
 * ```ts
 * const migrate = defineMigration([
 *   { type: 'addTable', name: 'sessions' },
 *   { type: 'addIndex', table: 'users', field: 'email' },
 *   { type: 'removeTable', name: 'legacyTokens' },
 * ]);
 *
 * const db = createIndexedDB({ name: 'app', version: 2, schema, migrate });
 * ```
 */
export function defineMigration(steps: MigrationStep[]): MigrationFn {
  return ({ db, tx }) => {
    for (const step of steps) {
      switch (step.type) {
        case 'addIndex': {
          const store = tx.objectStore(step.table);

          // keyPath mirrors the vault storage envelope: { value: T, expiresAt?: number }
          if (!store.indexNames.contains(step.field)) {
            store.createIndex(step.field, `value.${step.field}`);
          }

          break;
        }
        case 'addTable':
          if (!db.objectStoreNames.contains(step.name)) {
            db.createObjectStore(step.name);
          }

          break;
        case 'removeIndex': {
          const store = tx.objectStore(step.table);

          if (store.indexNames.contains(step.field)) {
            store.deleteIndex(step.field);
          }

          break;
        }
        case 'removeTable':
          if (db.objectStoreNames.contains(step.name)) {
            db.deleteObjectStore(step.name);
          }

          break;
      }
    }
  };
}
