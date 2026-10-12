import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { exportJWK, generateKeyPair, type JWK } from 'jose';
import type { AuthWorkerEnv } from '../auth';
import type { D1Like, D1Statement } from '../worker/env';

const MIGRATION = readFileSync(join(__dirname, '../../migrations/auth/0001_auth.sql'), 'utf8');

/**
 * A real SQLite database behind the D1 subset the issuer uses, built from the
 * package's own auth migration. `failOn` makes the next statement whose SQL contains
 * the fragment reject, modelling a D1 outage on exactly that step.
 */
export interface TestDb extends D1Like {
  failOn(fragment: string): void;
  readonly sqlite: DatabaseSync;
}

export function createTestDb(): TestDb {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  sqlite.exec(MIGRATION);
  const failures: string[] = [];
  const check = (sql: string): void => {
    const index = failures.findIndex((fragment) => sql.includes(fragment));
    if (index !== -1) {
      failures.splice(index, 1);
      throw new Error('D1_ERROR: simulated outage');
    }
  };
  const statement = (sql: string, params: SQLInputValue[] = []): D1Statement => ({
    async all<T>() {
      check(sql);
      return { results: sqlite.prepare(sql).all(...params) as T[] };
    },
    bind: (...next) => statement(sql, next),
    async first<T>() {
      check(sql);
      return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async run() {
      check(sql);
      return { meta: { changes: Number(sqlite.prepare(sql).run(...params).changes) } };
    },
  });
  return {
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const item of statements) results.push(await item.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    failOn: (fragment) => {
      failures.push(fragment);
    },
    prepare: (sql) => statement(sql),
    sqlite,
  };
}

export interface SentEmail {
  from: string;
  html?: string;
  subject: string;
  text: string;
  to: string;
}

export const APP_ORIGIN = 'http://localhost:5173';
export const ISSUER = 'http://127.0.0.1:8789';

export async function rsaPrivateJwk(): Promise<JWK> {
  const { privateKey } = await generateKeyPair('RS256', { extractable: true });
  return exportJWK(privateKey);
}

export interface Harness {
  archiveCalls: Request[];
  db: TestDb;
  env: AuthWorkerEnv;
  sent: SentEmail[];
}

/** A complete, valid local env; `overrides` replace individual bindings. */
export async function harness(
  overrides: Partial<Record<keyof AuthWorkerEnv, unknown>> = {},
  archive: (request: Request) => Promise<Response> = async () => new Response(null, { status: 204 }),
): Promise<Harness> {
  const db = createTestDb();
  const sent: SentEmail[] = [];
  const archiveCalls: Request[] = [];
  const env = {
    ALLOWED_ORIGINS: `${APP_ORIGIN},http://127.0.0.1:5173`,
    APP_ENV: 'local',
    APP_NAME: 'Test <App>',
    AUDIENCE: 'community-archive',
    AUTH_ARCHIVE: {
      fetch: (request: Request) => {
        archiveCalls.push(request);
        return archive(request);
      },
    },
    AUTH_DB: db,
    AUTH_EMAIL: {
      send: async (message: SentEmail) => {
        sent.push(message);
        return {};
      },
    },
    AUTH_ISSUER: ISSUER,
    AUTH_JWT_PRIVATE_JWK: JSON.stringify(await rsaPrivateJwk()),
    OPERATOR_EMAILS: 'op@example.test',
    PUBLIC_ORIGIN: APP_ORIGIN,
    SENDER_ADDRESS: 'noreply@example.test',
    ...overrides,
  } as AuthWorkerEnv;
  return { archiveCalls, db, env, sent };
}

export const url = (path: string): string => `${ISSUER}/api/v1/auth${path}`;

export const mutation = (path: string, init: RequestInit & { headers?: Record<string, string> } = {}): Request =>
  new Request(url(path), {
    ...init,
    headers: { origin: APP_ORIGIN, 'x-archive-request': '1', ...init.headers },
  });

export const signInRequest = (email: string): Request =>
  mutation('/sign-in', {
    body: JSON.stringify({ email }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

export const verifyRequest = (token: string): Request =>
  mutation('/verify', {
    body: JSON.stringify({ token }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

/** The token from the last magic link the harness "delivered". */
export const lastLinkToken = (sent: readonly SentEmail[]): string => {
  const match = /verify\?token=([A-Za-z0-9_-]+)/.exec(sent.at(-1)?.text ?? '');
  if (match === null) throw new Error('no magic link was sent');
  return match[1];
};

/** The `name=value` pair of a Set-Cookie header, ready to send back as a Cookie header. */
export const cookiePair = (response: Response): string => (response.headers.get('set-cookie') ?? '').split(';')[0];
