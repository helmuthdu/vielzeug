import { afterEach, describe, expect, it } from 'vitest';
import {
  ARCHIVE_CONTRACT_VERSION,
  archiveModerationLogSchema,
  archiveOwnReportsSchema,
  archiveReportsSchema,
} from '../contract';
import type { Session } from '../worker/auth';
import { type ArchiveWorkerEnv, apiConfig, type D1Statement } from '../worker/env';
import {
  deleteAccountProfile,
  deleteEntry,
  deleteProfile,
  erasePublisher,
  listModerationLog,
  listReports,
  myLikes,
  myReports,
  registerMe,
  reportEntry,
  resolveReport,
  setHidden,
  setLike,
  updateEntry,
} from '../worker/publications';
import { SQL } from '../worker/sql';
import { fixtureCollection } from './fixture-collection';
import { sqliteFixture } from './sqlite-fixture';

const databases: ReturnType<typeof sqliteFixture>[] = [];
afterEach(() => {
  for (const fixture of databases.splice(0)) fixture.database.close();
});

async function setup() {
  const fixture = sqliteFixture();
  databases.push(fixture);
  const ownerId = crypto.randomUUID();
  const operatorId = crypto.randomUUID();
  const createdAt = '2026-01-01T00:00:00.000Z';
  for (const id of [ownerId, operatorId])
    fixture.database
      .prepare('INSERT INTO publishers (id, issuer, subject, created_at) VALUES (?, ?, ?, ?)')
      .run(id, 'issuer', id, createdAt);
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
  const owner: Session = {
    operator: false,
    publisher: { displayName: '', id: ownerId },
    subject: { issuer: 'issuer', subject: ownerId },
  };
  const operator: Session = { ...owner, operator: true, publisher: { displayName: '', id: operatorId } };
  const derivation = await fixtureCollection.derive({ v: 4 });
  if (derivation === null) throw new Error('Invalid test payload');
  const content = derivation;
  async function entry() {
    const id = crypto.randomUUID();
    fixture.database
      .prepare(`INSERT INTO publications
      (id,owner_id,collection,client_key,schema_version,content_version,payload_json,content_hash,title,tags_json,published_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(
        id,
        ownerId,
        fixtureCollection.name,
        crypto.randomUUID(),
        ARCHIVE_CONTRACT_VERSION,
        1,
        content.canonicalJson,
        content.contentHash,
        content.title,
        JSON.stringify(content.tags),
        createdAt,
        createdAt,
      );
    return id;
  }
  return { ...fixture, entry, env, operator, operatorId, owner, ownerId };
}

const request = (path: string, body?: unknown) =>
  new Request(`http://localhost:5173/api/v1${path}`, {
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { 'content-type': 'application/json' }, method: 'POST' }),
  });

describe('transactional moderation', () => {
  it('preserves a like when moderation hides its entry before an unlike writes', async () => {
    const { env, owner, operator, entry, binding, database, ownerId } = await setup();
    const id = await entry();
    await setLike(fixtureCollection, env, apiConfig(env), owner, id, true);
    let started!: () => void;
    let release!: () => void;
    const writing = new Promise<void>((resolve) => {
      started = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    function delayed(statement: D1Statement): D1Statement {
      return {
        all: <T>() => statement.all<T>(),
        bind: (...params) => delayed(statement.bind(...params)),
        first: <T>() => statement.first<T>(),
        async run() {
          started();
          await gate;
          return statement.run();
        },
      };
    }
    env.DB = {
      batch: binding.batch,
      prepare: (sql) => (sql === SQL.removeLike ? delayed(binding.prepare(sql)) : binding.prepare(sql)),
    };
    const unlike = setLike(fixtureCollection, env, apiConfig(env), owner, id, false);
    const rejected = expect(unlike).rejects.toMatchObject({ code: 'not-found', status: 404 });
    await writing;
    await setHidden(fixtureCollection, env, operator, id, true);
    release();
    await rejected;
    expect(
      database.prepare('SELECT * FROM likes WHERE publication_id = ? AND publisher_id = ?').get(id, ownerId),
    ).toBeDefined();
    expect(database.prepare('SELECT like_count FROM publications WHERE id = ?').get(id)).toMatchObject({
      like_count: 1,
    });
  });

  it('removes a like when the unlike commits before moderation hides its entry', async () => {
    const { env, owner, operator, entry, database } = await setup();
    const id = await entry();
    await setLike(fixtureCollection, env, apiConfig(env), owner, id, true);
    const unlike = await setLike(fixtureCollection, env, apiConfig(env), owner, id, false);
    expect(await unlike.json()).toMatchObject({ likeCount: 0, liked: false });
    await setHidden(fixtureCollection, env, operator, id, true);
    expect(database.prepare('SELECT * FROM likes WHERE publication_id = ?').get(id)).toBeUndefined();
  });

  it('prevents a registration prepared before full erasure from recreating the subject', async () => {
    const { env, owner, binding, database } = await setup();
    await deleteProfile(env, owner);
    let started!: () => void;
    let release!: () => void;
    const registering = new Promise<void>((resolve) => {
      started = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    function delayed(statement: D1Statement): D1Statement {
      return {
        all: <T>() => statement.all<T>(),
        bind: (...params) => delayed(statement.bind(...params)),
        first: <T>() => statement.first<T>(),
        async run() {
          started();
          await gate;
          return statement.run();
        },
      };
    }
    env.DB = {
      batch: binding.batch,
      prepare: (sql) => (sql === SQL.insertPublisher ? delayed(binding.prepare(sql)) : binding.prepare(sql)),
    };
    const registration = registerMe(request('/me', { name: 'Recreated' }), env, { ...owner, publisher: null });
    const rejected = expect(registration).rejects.toMatchObject({ code: 'unauthenticated', status: 401 });
    await registering;
    await deleteAccountProfile(env, owner);
    release();
    await rejected;
    expect(database.prepare('SELECT * FROM publishers WHERE subject = ?').get(owner.subject.subject)).toBeUndefined();
    expect(
      database.prepare('SELECT * FROM revoked_subjects WHERE subject = ?').get(owner.subject.subject),
    ).toBeDefined();
  });

  it('records only one effective hide when two requests pre-read the visible entry', async () => {
    const { env, operator, entry } = await setup();
    const id = await entry();
    await Promise.all([
      setHidden(fixtureCollection, env, operator, id, true),
      setHidden(fixtureCollection, env, operator, id, true),
    ]);
    const log = await listModerationLog(request('/moderation-log'), env, operator);
    expect(await log.json()).toMatchObject({ actions: [{ action: 'hide', targetId: id }], cursor: null });
  });

  it('does not record duplicate removals or erasures', async () => {
    const { env, operator, entry, ownerId } = await setup();
    const id = await entry();
    await deleteEntry(fixtureCollection, env, operator, id);
    await deleteEntry(fixtureCollection, env, operator, id);
    await erasePublisher(env, operator, ownerId);
    await erasePublisher(env, operator, ownerId);
    const log = await listModerationLog(request('/moderation-log'), env, operator);
    const body = (await log.json()) as { actions: { action: string }[] };
    expect(body.actions.map((action) => action.action).sort()).toEqual(['erase-publisher', 'remove']);
  });

  it.each([4, 5])('rejects an edit of value %i that derives while another request hides the entry', async (v) => {
    const { env, owner, operator, entry } = await setup();
    const id = await entry();
    let started!: () => void;
    let release!: () => void;
    const deriving = new Promise<void>((resolve) => {
      started = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const collection = {
      ...fixtureCollection,
      async derive(raw: unknown) {
        started();
        await gate;
        return fixtureCollection.derive(raw);
      },
    };
    const edit = updateEntry(
      collection,
      request('/entries', { expectedRevision: 1, payload: { v } }),
      env,
      apiConfig(env),
      owner,
      id,
    );
    const rejected = expect(edit).rejects.toMatchObject({ code: 'forbidden', status: 403 });
    await deriving;
    await setHidden(fixtureCollection, env, operator, id, true);
    release();
    await rejected;
  });
});

describe('complete paginated private reads', () => {
  it('paginates operator reports, reporter history and audit actions past fifty rows', async () => {
    const { env, owner, operator, entry } = await setup();
    for (let i = 0; i < 53; i++) {
      const id = await entry();
      await reportEntry(fixtureCollection, request('/report', { reason: `Report ${i}` }), env, owner, id);
      await setHidden(fixtureCollection, env, operator, id, true);
    }
    async function collect(read: (params: URLSearchParams) => Promise<{ cursor: string | null; ids: string[] }>) {
      const ids: string[] = [];
      let cursor: string | null = null;
      do {
        const params = new URLSearchParams({ limit: '10' });
        if (cursor !== null) params.set('cursor', cursor);
        const page = await read(params);
        ids.push(...page.ids);
        cursor = page.cursor;
      } while (cursor !== null);
      expect(ids).toHaveLength(53);
      expect(new Set(ids).size).toBe(53);
      return ids;
    }
    const queue = await collect(async (params) => {
      const response = await listReports(fixtureCollection, request(`/reports?${params}`), env, operator);
      const page = archiveReportsSchema.parse(await response.json());
      return { cursor: page.cursor, ids: page.reports.map((row) => row.id) };
    });
    const history = await collect(async (params) => {
      const response = await myReports(request(`/me/reports?${params}`), env, owner);
      const page = archiveOwnReportsSchema.parse(await response.json());
      return { cursor: page.cursor, ids: page.reports.map((row) => row.id) };
    });
    expect(history).toEqual(queue);
    await collect(async (params) => {
      const response = await listModerationLog(request(`/moderation-log?${params}`), env, operator);
      const page = archiveModerationLogSchema.parse(await response.json());
      return { cursor: page.cursor, ids: page.actions.map((row) => row.id) };
    });
    const response = await listReports(fixtureCollection, request('/reports?limit=10'), env, operator);
    const first = archiveReportsSchema.parse(await response.json());
    expect(first.cursor).not.toBeNull();
    await expect(myReports(request(`/me/reports?cursor=${first.cursor}`), env, owner)).rejects.toMatchObject({
      status: 400,
    });
  });

  it('walks likes beyond the old 1000-item bound without losing timestamp ties', async () => {
    const { env, database, owner, operatorId } = await setup();
    const insert = database.prepare(`INSERT INTO publications
      (id,owner_id,collection,client_key,schema_version,content_version,payload_json,content_hash,title,tags_json,published_at,updated_at)
      VALUES (?,?,?, ?,1,1,'{"v":4}',?,'fixture-4','[]',?,?)`);
    const like = database.prepare('INSERT INTO likes VALUES (?, ?, ?)');
    const expected = new Set<string>();
    for (let i = 0; i < 1003; i++) {
      const id = crypto.randomUUID();
      expected.add(id);
      insert.run(
        id,
        operatorId,
        'fixture',
        crypto.randomUUID(),
        'a'.repeat(64),
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
      );
      like.run(id, owner.publisher?.id ?? '', '2026-01-01T00:00:00.000Z');
    }
    let cursor: string | null = null;
    const actual: string[] = [];
    do {
      const params = new URLSearchParams({ limit: '50' });
      if (cursor !== null) params.set('cursor', cursor);
      const res = await myLikes(request(`/me/likes?${params}`), env, owner);
      const page = (await res.json()) as { cursor: string | null; ids: string[] };
      actual.push(...page.ids);
      cursor = page.cursor;
    } while (cursor !== null);
    expect(actual).toHaveLength(expected.size);
    expect(new Set(actual)).toEqual(expected);
  });

  it('resolves reports without hiding content and exports the reporter history', async () => {
    const { env, owner, operator, entry } = await setup();
    const id = await entry();
    await reportEntry(fixtureCollection, request('/report', { reason: 'Spam' }), env, owner, id);
    const res = await listReports(fixtureCollection, request('/reports'), env, operator);
    const page = (await res.json()) as { reports: { id: string }[] };
    const report = page.reports[0];
    expect(report).toBeDefined();
    await resolveReport(fixtureCollection, env, operator, report.id);
    const unresolved = await listReports(fixtureCollection, request('/reports'), env, operator);
    expect(await unresolved.json()).toEqual({ cursor: null, reports: [] });
    const resolved = await listReports(fixtureCollection, request('/reports?status=resolved'), env, operator);
    expect(await resolved.json()).toMatchObject({ reports: [{ id: report.id, resolvedAt: expect.any(String) }] });
    const history = await myReports(request('/me/reports'), env, owner);
    expect(await history.json()).toMatchObject({ reports: [{ collection: 'fixture', reason: 'Spam' }] });
  });
});
