import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { D1Like, D1Statement } from '../worker/env';

export function sqliteFixture() {
  const database = new DatabaseSync(':memory:');
  database.exec('PRAGMA foreign_keys = ON');
  database.exec(readFileSync(new URL('../../migrations/0001_community_archive.sql', import.meta.url), 'utf8'));
  class Statement implements D1Statement {
    readonly sql: string;
    readonly params: (string | number | null)[];
    constructor(sql: string, params: (string | number | null)[] = []) {
      this.sql = sql;
      this.params = params;
    }
    bind(...params: (string | number | null)[]): Statement {
      return new Statement(this.sql, params);
    }
    async all<T>() {
      return { results: database.prepare(this.sql).all(...this.params) as T[] };
    }
    async first<T>() {
      return (database.prepare(this.sql).get(...this.params) as T | undefined) ?? null;
    }
    async run() {
      return { meta: { changes: Number(database.prepare(this.sql).run(...this.params).changes) } };
    }
  }
  const binding: D1Like = {
    async batch(statements) {
      database.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) {
          if (!(statement instanceof Statement)) throw new Error('Unexpected test statement');
          results.push({ meta: { changes: Number(database.prepare(statement.sql).run(...statement.params).changes) } });
        }
        database.exec('COMMIT');
        return results;
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
    prepare: (sql) => new Statement(sql),
  };
  return { binding, database };
}
