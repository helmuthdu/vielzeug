import { s } from '@vielzeug/spell';
import { afterEach, describe, expect, it } from 'vitest';
import { defineArchiveCollection } from '../collection';
import type { Session } from '../worker/auth';
import { type ArchiveWorkerEnv, apiConfig } from '../worker/env';
import { getEntry, listEntries, publishEntry } from '../worker/publications';
import { sqliteFixture } from './sqlite-fixture';

const fixtures: ReturnType<typeof sqliteFixture>[] = [];
afterEach(() => {
  for (const fixture of fixtures.splice(0)) fixture.database.close();
});

function setup() {
  const fixture = sqliteFixture();
  fixtures.push(fixture);
  const id = crypto.randomUUID();
  fixture.database
    .prepare('INSERT INTO publishers(id, issuer, subject, created_at) VALUES (?, ?, ?, ?)')
    .run(id, 'issuer', 'subject', new Date().toISOString());
  const session: Session = {
    operator: false,
    publisher: { displayName: '', id },
    subject: { issuer: 'issuer', subject: 'subject' },
  };
  const env: ArchiveWorkerEnv = {
    ALLOWED_ORIGINS: 'http://localhost:5173',
    APP_ENV: 'local',
    AUTH_ISSUER_SERVICE: { fetch: async () => Response.json({ ok: true }) },
    DB: fixture.binding,
    JWT_AUDIENCE: 'archive',
    JWT_ISSUER: 'http://localhost:8930',
    JWT_JWKS_URL: 'http://localhost:8930/jwks',
    LIKES_ENABLED: 'true',
    PUBLISHING_ENABLED: 'true',
    RATE_LIMIT_KEY_SECRET: 'local',
    READ_LIMIT: { limit: async () => ({ success: true }) },
    WRITE_LIMIT: { limit: async () => ({ success: true }) },
  };
  return { ...fixture, env, session };
}

const definition = (contentVersion: number, label: string) =>
  defineArchiveCollection({
    contentVersion,
    filters: [label],
    index: (payload) => ({ filter: label, tags: [label], title: `${label} ${payload.title}` }),
    name: 'notes',
    payloadSchema: s.object({ title: s.string() }),
    tags: [label],
  });

const publishRequest = () =>
  new Request('http://localhost:5173/api/v1/collections/notes/entries', {
    body: JSON.stringify({ clientKey: crypto.randomUUID(), payload: { title: 'Example' } }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

describe('collection definition lifecycle', () => {
  it('does not reinterpret a stored entry through a newer content definition', async () => {
    const { env, session, database } = setup();
    const original = definition(1, 'old');
    const response = await publishEntry(original, publishRequest(), env, apiConfig(env), session);
    const entry = original.contract.entry.parse(await response.json());
    await expect(getEntry(definition(2, 'new'), env, entry.id)).rejects.toMatchObject({
      code: 'record-unavailable',
      status: 503,
    });
    expect(database.prepare('SELECT title, content_version FROM publications WHERE id = ?').get(entry.id)).toEqual({
      content_version: 1,
      title: 'old Example',
    });
  });

  it('derives fresh search, filter and tag projections after a development dataset reset', async () => {
    const { env, session, database } = setup();
    await publishEntry(definition(1, 'old'), publishRequest(), env, apiConfig(env), session);
    database.exec('DELETE FROM publications; DELETE FROM publication_requests;');
    const current = definition(2, 'new');
    await publishEntry(current, publishRequest(), env, apiConfig(env), session);
    const response = await listEntries(
      current,
      new Request('http://localhost:5173/api/v1/collections/notes/entries?filter=new&tag=new&search=new'),
      env,
    );
    const page = current.contract.page.parse(await response.json());
    expect(page.entries).toHaveLength(1);
    expect(page.entries[0]?.contentVersion).toBe(2);
    expect(database.prepare('SELECT title, filter_value, tags_json FROM publications').get()).toEqual({
      filter_value: 'new',
      tags_json: '["new"]',
      title: 'new Example',
    });
  });
});
