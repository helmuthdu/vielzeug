import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ARCHIVE_LIMITS, ARCHIVE_MODERATION_ACTIONS, ARCHIVE_SCHEMA_VERSION } from '../contract';
import { sqliteFixture } from './sqlite-fixture';

const MIGRATIONS_DIR = join(__dirname, '../../migrations');
const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql'));
const fixtures: ReturnType<typeof sqliteFixture>[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) fixture.database.close();
});

function setup() {
  const fixture = sqliteFixture();
  fixtures.push(fixture);
  const { database } = fixture;
  const ownerId = crypto.randomUUID();
  const at = '2026-01-01T00:00:00.000Z';
  database
    .prepare('INSERT INTO publishers(id, issuer, subject, display_name, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(ownerId, 'issuer', 'subject', '', at);
  const insertEntry = (values: { payload?: string; tags?: string[]; title?: string } = {}) => {
    const id = crypto.randomUUID();
    database
      .prepare(`INSERT INTO publications
        (id, owner_id, collection, client_key, schema_version, content_version,
         payload_json, content_hash, title, tags_json, published_at, updated_at)
        VALUES (?, ?, 'fixture', ?, 1, 1, ?, ?, ?, ?, ?, ?)`)
      .run(
        id,
        ownerId,
        crypto.randomUUID(),
        values.payload ?? '{}',
        'a'.repeat(64),
        values.title ?? 'Title',
        JSON.stringify(values.tags ?? []),
        at,
        at,
      );
    return id;
  };
  return { at, database, insertEntry, ownerId };
}

describe('the package-owned migration', () => {
  it('is one debut file', () => {
    expect(migrationFiles).toEqual(['0001_community_archive.sql']);
  });

  it('stamps the storage schema at ARCHIVE_SCHEMA_VERSION', () => {
    const { database } = setup();
    expect(database.prepare('SELECT applied FROM archive_schema_meta').all()).toEqual([
      { applied: ARCHIVE_SCHEMA_VERSION },
    ]);
  });

  it('enforces the canonical payload byte limit independently of HTTP validation', () => {
    const { insertEntry } = setup();
    const payload = (bytes: number) => JSON.stringify({ pad: 'x'.repeat(bytes - 10) });
    expect(() => insertEntry({ payload: payload(ARCHIVE_LIMITS.payloadBytes) })).not.toThrow();
    expect(() => insertEntry({ payload: payload(ARCHIVE_LIMITS.payloadBytes + 1) })).toThrow(/CHECK/);
    expect(() => insertEntry({ payload: '[]' })).toThrow(/CHECK/);
    expect(() => insertEntry({ payload: '{' })).toThrow(/CHECK/);
  });

  it('enforces title bounds on inserts and updates', () => {
    const { database, insertEntry } = setup();
    const id = insertEntry({ title: 'x'.repeat(ARCHIVE_LIMITS.titleChars) });
    expect(() => insertEntry({ title: 'x'.repeat(ARCHIVE_LIMITS.titleChars + 1) })).toThrow(/CHECK/);
    expect(() => insertEntry({ title: '   ' })).toThrow(/CHECK/);
    expect(() => database.prepare('UPDATE publications SET title = ? WHERE id = ?').run('', id)).toThrow(/CHECK/);
  });

  it('enforces the tag count boundary', () => {
    const { insertEntry } = setup();
    const tags = Array.from({ length: ARCHIVE_LIMITS.tagsPerEntry }, (_, i) => `tag-${i}`);
    expect(() => insertEntry({ tags })).not.toThrow();
    expect(() => insertEntry({ tags: [...tags, 'extra'] })).toThrow(/CHECK/);
  });

  it('enforces publisher alias bounds on writes', () => {
    const { database, ownerId } = setup();
    const rename = database.prepare('UPDATE publishers SET display_name = ? WHERE id = ?');
    expect(() => rename.run('x'.repeat(ARCHIVE_LIMITS.aliasChars), ownerId)).not.toThrow();
    expect(() => rename.run('x'.repeat(ARCHIVE_LIMITS.aliasChars + 1), ownerId)).toThrow(/CHECK/);
  });

  it('enforces report reason bounds', () => {
    const { database, insertEntry, ownerId, at } = setup();
    const report = (reason: string) =>
      database
        .prepare(
          'INSERT INTO publication_reports(id, publication_id, reporter_id, reason, created_at) VALUES (?, ?, ?, ?, ?)',
        )
        .run(crypto.randomUUID(), insertEntry(), ownerId, reason, at);
    expect(() => report('x'.repeat(ARCHIVE_LIMITS.reportReasonChars))).not.toThrow();
    expect(() => report('x'.repeat(ARCHIVE_LIMITS.reportReasonChars + 1))).toThrow(/CHECK/);
    expect(() => report('   ')).toThrow(/CHECK/);
  });

  it('enforces the moderation action vocabulary without requiring surviving targets', () => {
    const { database, at } = setup();
    const audit = (action: string) =>
      database
        .prepare(
          'INSERT INTO moderation_actions(id, operator_id, action, collection, target_id, created_at) VALUES (?, ?, ?, NULL, ?, ?)',
        )
        .run(crypto.randomUUID(), crypto.randomUUID(), action, crypto.randomUUID(), at);
    for (const action of ARCHIVE_MODERATION_ACTIONS) expect(() => audit(action)).not.toThrow();
    expect(() => audit('unknown')).toThrow(/CHECK/);
  });
});
