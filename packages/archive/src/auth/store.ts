import type { D1Like } from '../worker/env';
import { databaseOperation } from './errors';

/**
 * The issuer's storage, written against exactly `migrations/auth/0001_auth.sql`.
 * Token rows are single-use credentials only; the send allowance lives in its own
 * durable table, so consuming or expiring a link never refunds the budget.
 */
export const LINK_TTL_MS = 15 * 60 * 1000;
export const LINK_WINDOW_MS = 60 * 60 * 1000;
export const LINKS_PER_WINDOW = 3;
export const SIGN_IN_WINDOW_MS = 60_000;
export const SIGN_INS_PER_WINDOW = 20;

export interface AccountRow {
  created_at: string;
  email: string;
  id: string;
  last_sign_in_at: string | null;
  session_version: number;
}

const SQL = {
  account: 'SELECT id, email, created_at, last_sign_in_at, session_version FROM auth_users WHERE id = ?',
  budgetWindow: 'SELECT window_start FROM auth_link_budget WHERE user_id = ?',
  consumeToken: `UPDATE auth_tokens SET redeemed_at = ?1 WHERE token_hash = ?2 AND expires_at > ?3
RETURNING user_id AS id, (SELECT email FROM auth_users WHERE id = user_id) AS email,
  (SELECT session_version FROM auth_users WHERE id = user_id) AS sessionVersion`,
  deleteAccount: 'DELETE FROM auth_users WHERE id = ?',
  deleteToken: 'DELETE FROM auth_tokens WHERE token_hash = ?',
  // The no-op update makes RETURNING answer for an existing row too.
  ensureUser:
    'INSERT INTO auth_users (id, email, created_at, last_sign_in_at) VALUES (?, ?, ?, NULL) ON CONFLICT (email) DO UPDATE SET email = excluded.email RETURNING id, email',
  insertToken: 'INSERT INTO auth_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
  revokeSessions: `UPDATE auth_users SET session_version = session_version + 1
WHERE id = ? AND session_version = ? RETURNING session_version`,
  signInWindow: 'SELECT window_start FROM auth_sign_in_budget WHERE id = 1',
  // One atomic statement opens a window, counts within it, or refuses: no row back
  // means the allowance is spent. Concurrent requests cannot both pass the bound.
  spendBudget: `INSERT INTO auth_link_budget (user_id, window_start, sent) VALUES (?1, ?2, 1)
ON CONFLICT (user_id) DO UPDATE SET
  window_start = CASE WHEN auth_link_budget.window_start <= ?3 THEN ?2 ELSE auth_link_budget.window_start END,
  sent = CASE WHEN auth_link_budget.window_start <= ?3 THEN 1 ELSE auth_link_budget.sent + 1 END
WHERE auth_link_budget.window_start <= ?3 OR auth_link_budget.sent < ?4
RETURNING sent`,
  spendSignInBudget: `INSERT INTO auth_sign_in_budget (id, window_start, admitted) VALUES (1, ?1, 1)
ON CONFLICT (id) DO UPDATE SET
  window_start = CASE WHEN auth_sign_in_budget.window_start <= ?2 THEN ?1 ELSE auth_sign_in_budget.window_start END,
  admitted = CASE WHEN auth_sign_in_budget.window_start <= ?2 THEN 1 ELSE auth_sign_in_budget.admitted + 1 END
WHERE auth_sign_in_budget.window_start <= ?2 OR auth_sign_in_budget.admitted < ?3
RETURNING admitted`,
  sweepBudget: 'DELETE FROM auth_link_budget WHERE window_start <= ?',
  sweepTokens: 'DELETE FROM auth_tokens WHERE expires_at <= ?',
  // Rows for emails that never completed a sign-in leave once nothing references them.
  sweepUnverified:
    'DELETE FROM auth_users WHERE last_sign_in_at IS NULL AND NOT EXISTS (SELECT 1 FROM auth_tokens t WHERE t.user_id = auth_users.id) AND NOT EXISTS (SELECT 1 FROM auth_link_budget b WHERE b.user_id = auth_users.id)',
} as const;

export async function ensureUser(db: D1Like, email: string): Promise<{ email: string; id: string }> {
  const row = await databaseOperation(() =>
    db
      .prepare(SQL.ensureUser)
      .bind(crypto.randomUUID(), email, new Date().toISOString())
      .first<{ email: string; id: string }>(),
  );
  if (row === null) throw new Error('The account row could not be ensured.');
  return row;
}

/** The deployment-wide admission budget is spent before account creation or delivery. */
export async function spendSignInBudget(db: D1Like, nowMs: number): Promise<number | null> {
  return databaseOperation(async () => {
    const spent = await db
      .prepare(SQL.spendSignInBudget)
      .bind(nowMs, nowMs - SIGN_IN_WINDOW_MS, SIGN_INS_PER_WINDOW)
      .first<{ admitted: number }>();
    if (spent !== null) return null;
    const open = await db.prepare(SQL.signInWindow).first<{ window_start: number }>();
    return Math.max(1, Math.ceil(((open?.window_start ?? nowMs) + SIGN_IN_WINDOW_MS - nowMs) / 1000));
  });
}

/** Spends one send from the hourly allowance; returns the seconds until it reopens when spent. */
export async function spendLinkBudget(db: D1Like, userId: string, nowMs: number): Promise<number | null> {
  return databaseOperation(async () => {
    const windowFloor = nowMs - LINK_WINDOW_MS;
    const spent = await db
      .prepare(SQL.spendBudget)
      .bind(userId, nowMs, windowFloor, LINKS_PER_WINDOW)
      .first<{ sent: number }>();
    if (spent !== null) return null;
    const open = await db.prepare(SQL.budgetWindow).bind(userId).first<{ window_start: number }>();
    const reopensAt = (open?.window_start ?? nowMs) + LINK_WINDOW_MS;
    return Math.max(1, Math.ceil((reopensAt - nowMs) / 1000));
  });
}

export async function insertToken(db: D1Like, tokenHash: string, userId: string, nowMs: number): Promise<void> {
  await databaseOperation(() =>
    db
      .prepare(SQL.insertToken)
      .bind(tokenHash, userId, nowMs + LINK_TTL_MS)
      .run(),
  );
}

export async function deleteToken(db: D1Like, tokenHash: string): Promise<void> {
  await databaseOperation(() => db.prepare(SQL.deleteToken).bind(tokenHash).run());
}

/** Single-use consume: the unexpired row answers once and is gone after; the account is stamped signed in. */
export async function consumeToken(
  db: D1Like,
  tokenHash: string,
  nowMs: number,
): Promise<{ email: string; id: string; sessionVersion: number } | null> {
  return databaseOperation(() =>
    db
      .prepare(SQL.consumeToken)
      .bind(new Date(nowMs).toISOString(), tokenHash, nowMs)
      .first<{ email: string; id: string; sessionVersion: number }>(),
  );
}

/** The trigger deletes outstanding links within this same atomic version change. */
export function revokeSessions(
  db: D1Like,
  subject: string,
  version: number,
): Promise<{ session_version: number } | null> {
  return databaseOperation(() =>
    db.prepare(SQL.revokeSessions).bind(subject, version).first<{ session_version: number }>(),
  );
}

export async function authReadiness(db: D1Like): Promise<number | null> {
  return databaseOperation(async () => {
    const columns = {
      auth_link_budget: ['user_id', 'window_start', 'sent'],
      auth_schema_meta: ['id', 'applied'],
      auth_sign_in_budget: ['id', 'window_start', 'admitted'],
      auth_tokens: ['token_hash', 'user_id', 'expires_at', 'redeemed_at'],
      auth_users: ['id', 'email', 'created_at', 'last_sign_in_at', 'session_version'],
    } as const;
    for (const [table, expected] of Object.entries(columns)) {
      const actual = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
      if (!expected.every((name) => actual.results?.some((column) => column.name === name))) return null;
    }
    const triggers = await db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'trigger' AND name IN ('auth_token_redeemed', 'auth_sessions_revoked')",
      )
      .all<{ name: string }>();
    if (triggers.results?.length !== 2) return null;
    const stamp = await db.prepare('SELECT applied FROM auth_schema_meta WHERE id = 1').first<{ applied: number }>();
    await db
      .prepare(`SELECT u.id, u.email, u.created_at, u.last_sign_in_at, u.session_version,
      t.token_hash, t.user_id, t.expires_at, t.redeemed_at,
      b.user_id, b.window_start, b.sent, s.id, s.window_start, s.admitted
      FROM auth_users u LEFT JOIN auth_tokens t ON 0 LEFT JOIN auth_link_budget b ON 0
      LEFT JOIN auth_sign_in_budget s ON 0 LIMIT 1`)
      .first();
    return typeof stamp?.applied === 'number' && Number.isSafeInteger(stamp.applied) && stamp.applied >= 0
      ? stamp.applied
      : null;
  });
}

export function readAccount(db: D1Like, userId: string): Promise<AccountRow | null> {
  return databaseOperation(() => db.prepare(SQL.account).bind(userId).first<AccountRow>());
}

/** Removes the account; FK cascades take its tokens and send budget. Idempotent. */
export async function deleteAccount(db: D1Like, userId: string): Promise<void> {
  await databaseOperation(() => db.prepare(SQL.deleteAccount).bind(userId).run());
}

/** The scheduled sweep: expired links, closed send windows, then never-verified accounts left unreferenced. */
export async function sweep(db: D1Like, nowMs: number): Promise<number> {
  const results = await databaseOperation(() =>
    db.batch([
      db.prepare(SQL.sweepTokens).bind(nowMs),
      db.prepare(SQL.sweepBudget).bind(nowMs - LINK_WINDOW_MS),
      db.prepare(SQL.sweepUnverified),
    ]),
  );
  return results.reduce((total, result) => total + (result.meta?.changes ?? 0), 0);
}
