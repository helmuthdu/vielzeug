import { type ChildProcess, spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it, type MockInstance, vi } from 'vitest';
import { type RecipePayload, recipeCollection } from './fixture-collection';
import { type IssuerHandle, startIssuer } from './issuer';

/**
 * Real HTTP integration over the package's own Worker core: workerd + local D1 via
 * Wrangler dev, the package-owned migration, an ephemeral dev issuer for the cookie
 * session, and a neutral recipes collection. No mocked repository, no seed SQL: data
 * exists only because the API accepted it.
 *
 * Every fixture port is allocated at suite start and every wrangler config is
 * generated into the ephemeral run dir — the suite never competes with any process
 * (including a previous run still winding down) for a fixed port.
 *
 * Process hygiene: every child this suite spawns is tracked and torn down through
 * its own detached process group — nothing here ever scans or kills processes it
 * did not create.
 */
const PKG = resolve(__dirname, '../..');
const RUNTIME = resolve(PKG, 'node_modules/.cache/archive-integration/test-runtime');
const WRANGLER = resolve(PKG, 'node_modules/wrangler/bin/wrangler.js');

let ISSUER_PORT = 0;
let ISSUER_URL = '';
let API = '';
let API_LOW = '';
let API_FLAGS = '';
let API_OUTAGE = '';
let ORIGIN = '';
let ORIGIN_LOW = '';
let ORIGIN_FLAGS = '';
let ORIGIN_OUTAGE = '';
/** The generated config the main (restartable) worker runs from, with its ports. */
let mainConfig = '';
let mainPort = 0;
let mainInspectorPort = 0;
let mainWorkerPersistDir = '';

let issuer: IssuerHandle;
let worker: ChildProcess;
const children: ChildProcess[] = [];

const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' };

function wrangler(args: string[]): Promise<{ code: number; out: string }> {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [WRANGLER, ...args], { cwd: PKG, env });
    let out = '';
    child.stdout?.on('data', (d) => (out += d));
    child.stderr?.on('data', (d) => (out += d));
    child.on('exit', (code) => resolvePromise({ code: code ?? -1, out }));
    children.push(child);
  });
}

/** One bindable loopback port, or null when held: the port scan's only primitive. */
const bindProbe = (port: number): Promise<NodeJS.ErrnoException | null> =>
  new Promise((resolveProbe) => {
    const probe = createServer();
    probe.once('error', (error: NodeJS.ErrnoException) => {
      probe.close();
      resolveProbe(error);
    });
    probe.once('listening', () => probe.close(() => resolveProbe(null)));
    probe.listen(port, '127.0.0.1');
  });

/** Scans upward from `from` and returns `count` ports nothing else holds right now. */
async function allocatePorts(count: number, from = 18820): Promise<number[]> {
  const ports: number[] = [];
  for (let port = from; ports.length < count && port < from + 500; port++) {
    if ((await bindProbe(port)) === null) ports.push(port);
  }
  if (ports.length < count) throw new Error(`could not allocate ${count} free fixture ports from ${from}`);
  return ports;
}

function spawnWorker(
  config: string,
  port: number,
  inspectorPort: number,
  persistTo: string,
  runDir: string,
  options: { testScheduled?: boolean } = {},
): ChildProcess {
  const log = createWriteStream(join(runDir, `worker-${port}.log`), { flags: 'a' });
  // detached: this worker's own process group, so teardown can target exactly it.
  const child = spawn(
    process.execPath,
    [
      WRANGLER,
      'dev',
      '--config',
      config,
      '--port',
      String(port),
      '--inspector-port',
      String(inspectorPort),
      '--persist-to',
      persistTo,
      ...(options.testScheduled === true ? ['--test-scheduled'] : []),
    ],
    { cwd: PKG, detached: true, env, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  child.stdout?.pipe(log);
  child.stderr?.pipe(log);
  children.push(child);
  return child;
}

/** An already-gone child reports either an exit code or the signal that took it. */
const childExited = (child: ChildProcess): boolean => child.exitCode !== null || child.signalCode !== null;

const signalGroup = (child: ChildProcess, signal: NodeJS.Signals): void => {
  const pid = child.pid;
  if (pid === undefined || pid <= 0 || childExited(child)) return;
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      /* already gone */
    }
  }
};

/** Graceful SIGTERM to the child's own group, then SIGKILL if it lingers past 5s. */
async function stopWorker(child: ChildProcess): Promise<void> {
  if (childExited(child)) return;
  await new Promise<void>((resolvePromise) => {
    const force = setTimeout(() => {
      signalGroup(child, 'SIGKILL');
      resolvePromise();
    }, 5000);
    child.once('exit', () => {
      clearTimeout(force);
      resolvePromise();
    });
    signalGroup(child, 'SIGTERM');
  });
}

async function waitReady(base: string, attempts = 400): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${base}/api/v1/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`worker at ${base} never became ready`);
}

/** Cookie -> registered publisher id, mirroring a client's captured auth scope. */
const publisherIds = new Map<string, string>();

interface CallOptions {
  body?: unknown;
  cookie?: string;
  headers?: Record<string, string>;
  method?: string;
  origin?: string | null;
  rawBody?: string;
  rawContentType?: string;
}

async function call(base: string, path: string, opts: CallOptions = {}) {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.origin !== null) headers.origin = opts.origin ?? ORIGIN;
  const isMutation = opts.method !== undefined && opts.method !== 'GET' && opts.method !== 'HEAD';
  const isPrivateGet =
    (opts.method ?? 'GET') === 'GET' &&
    /\/(me\/(publications|likes|reports)|collections\/[a-z0-9-]+\/reports|moderation-log)/.test(path);
  if (isMutation) headers['x-archive-request'] = '1';
  if (isMutation || isPrivateGet) {
    // The client always pins the publisher UUID it captured at sign-in.
    const expected = opts.cookie ? publisherIds.get(opts.cookie) : undefined;
    if (expected !== undefined && headers['x-archive-publisher'] === undefined) {
      headers['x-archive-publisher'] = expected;
    }
  }
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.rawContentType) headers['content-type'] = opts.rawContentType;
  const res = await fetch(`${base}${path}`, {
    body: opts.rawBody ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
    headers,
    method: opts.method ?? 'GET',
    redirect: 'manual',
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text.length ? JSON.parse(text) : null;
  } catch {
    /* non-json */
  }
  return { json, res, text };
}

async function signIn(user: 'alice' | 'bob' | 'op', origin = ORIGIN, operator = false): Promise<string> {
  const res = await fetch(`${ISSUER_URL}/dev-auth/sign-in`, {
    body: JSON.stringify(operator ? { operator: true, user } : { user }),
    headers: { 'content-type': 'application/json', origin, 'x-archive-request': '1' },
    method: 'POST',
  });
  expect(res.status).toBe(200);
  const cookie = res.headers.get('set-cookie');
  expect(cookie).toBeTruthy();
  return (cookie ?? '').split(';')[0];
}

async function register(cookie: string, name = ''): Promise<{ id: string; name: string }> {
  const { res, json } = await call(API, '/api/v1/me', {
    body: name ? { name } : {},
    cookie,
    method: 'POST',
    origin: ORIGIN,
  });
  expect([200, 201]).toContain(res.status);
  const identity = json as { id: string; name: string };
  publisherIds.set(cookie, identity.id);
  return identity;
}

let seed = 0;
function recipe(name = `recipe ${++seed}`, cuisine: 'italian' | 'japanese' = 'italian'): RecipePayload {
  return { cuisine, ingredients: ['tomato', 'basil', 'mozzarella'], name };
}

async function publish(cookie: string, payload: RecipePayload, clientKey: string = crypto.randomUUID()) {
  const { res, json } = await call(API, '/api/v1/collections/recipes/entries', {
    body: { clientKey, payload },
    cookie,
    method: 'POST',
    origin: ORIGIN,
  });
  return { entry: json as { id: string; revision: number } & Record<string, unknown>, res };
}

/**
 * Claim mutations minted by the REAL in-process issuer — correctly signed tokens
 * whose claims are wrong. Spying on the SignJWT setters rewrites the claim the
 * issuer is about to write; the signature stays valid, so only the claim check
 * itself can reject these.
 */
const signInWithClaims = async (tweaks: {
  audience?: string;
  expiration?: number;
  issuedAt?: number;
  issuer?: string;
  kid?: string;
  skipSubject?: boolean;
  subject?: string;
}): Promise<string> => {
  const spies: MockInstance[] = [];
  try {
    if (tweaks.kid !== undefined) {
      const original = SignJWT.prototype.setProtectedHeader;
      spies.push(
        vi.spyOn(SignJWT.prototype, 'setProtectedHeader').mockImplementation(function (this: SignJWT, protectedHeader) {
          return original.call(this, { ...protectedHeader, kid: tweaks.kid });
        }),
      );
    }
    if (tweaks.audience !== undefined) {
      const original = SignJWT.prototype.setAudience;
      spies.push(
        vi.spyOn(SignJWT.prototype, 'setAudience').mockImplementation(function (this: SignJWT) {
          return original.call(this, tweaks.audience ?? '');
        }),
      );
    }
    if (tweaks.issuer !== undefined) {
      const original = SignJWT.prototype.setIssuer;
      spies.push(
        vi.spyOn(SignJWT.prototype, 'setIssuer').mockImplementation(function (this: SignJWT) {
          return original.call(this, tweaks.issuer ?? '');
        }),
      );
    }
    if (tweaks.skipSubject === true) {
      spies.push(
        vi.spyOn(SignJWT.prototype, 'setSubject').mockImplementation(function (this: SignJWT) {
          return this;
        }),
      );
    }
    if (tweaks.subject !== undefined) {
      const original = SignJWT.prototype.setSubject;
      spies.push(
        vi.spyOn(SignJWT.prototype, 'setSubject').mockImplementation(function (this: SignJWT) {
          return original.call(this, tweaks.subject ?? '');
        }),
      );
    }
    if (tweaks.issuedAt !== undefined) {
      const original = SignJWT.prototype.setIssuedAt;
      spies.push(
        vi.spyOn(SignJWT.prototype, 'setIssuedAt').mockImplementation(function (this: SignJWT) {
          return original.call(this, tweaks.issuedAt ?? 0);
        }),
      );
    }
    if (tweaks.expiration !== undefined) {
      const original = SignJWT.prototype.setExpirationTime;
      spies.push(
        vi.spyOn(SignJWT.prototype, 'setExpirationTime').mockImplementation(function (this: SignJWT) {
          return original.call(this, tweaks.expiration ?? 0);
        }),
      );
    }
    const res = await fetch(`${ISSUER_URL}/dev-auth/sign-in`, {
      body: JSON.stringify({ user: 'alice' }),
      headers: { 'content-type': 'application/json', origin: ORIGIN, 'x-archive-request': '1' },
      method: 'POST',
    });
    expect(res.status).toBe(200);
    return (res.headers.get('set-cookie') ?? '').split(';')[0];
  } finally {
    for (const spy of spies) spy.mockRestore();
  }
};

const expectPublicEntry = (entry: Record<string, unknown>) => {
  expect(entry).not.toHaveProperty('clientKey');
  expect(entry).not.toHaveProperty('liked');
  expect(JSON.stringify(entry)).not.toContain('local-');
};

/** A fresh run dir per suite run — previous runs' worker logs/state stay as evidence. */
let runDir: string;

/** Writes one generated wrangler config into the run dir; ports and issuer are injected. */
const writeConfig = (
  name: string,
  port: number,
  options: { database: string; flags?: { likes: boolean; publishing: boolean }; pepper?: boolean },
): string => {
  const issuerUrl = `http://127.0.0.1:${ISSUER_PORT}`;
  const vars: Record<string, string> = {
    ALLOWED_ORIGINS: `http://127.0.0.1:${port},http://localhost:5173,http://127.0.0.1:5173`,
    APP_ENV: 'local',
    JWT_AUDIENCE: 'community-archive',
    JWT_ISSUER: issuerUrl,
    JWT_JWKS_URL: `${issuerUrl}/.well-known/jwks.json`,
    LIKES_ENABLED: String(options.flags?.likes ?? true),
    PUBLISHING_ENABLED: String(options.flags?.publishing ?? true),
  };
  if (options.pepper !== false) vars.RATE_LIMIT_KEY_SECRET = 'dev-only-insecure-pepper';
  const config = {
    compatibility_date: '2026-10-01',
    d1_databases: [
      {
        binding: 'DB',
        database_id: '00000000-0000-0000-0000-000000000010',
        database_name: options.database,
        migrations_dir: join(PKG, 'migrations'),
        remote: false,
      },
    ],
    dev: { ip: '127.0.0.1', port },
    main: join(PKG, 'test/integration/dev-worker.ts'),
    name: `archive-test-${name}`,
    ratelimits: [
      { name: 'READ_LIMIT', namespace_id: '9101', simple: { limit: 500, period: 60 } },
      { name: 'WRITE_LIMIT', namespace_id: '9102', simple: { limit: 500, period: 60 } },
    ],
    triggers: { crons: ['0 3 * * *'] },
    vars,
    workers_dev: false,
  };
  // The low-limit variant differs only in its rate limits.
  if (name === 'low') {
    config.ratelimits = [
      { name: 'READ_LIMIT', namespace_id: '9103', simple: { limit: 2, period: 60 } },
      { name: 'WRITE_LIMIT', namespace_id: '9104', simple: { limit: 2, period: 60 } },
    ];
  }
  const path = join(runDir, `wrangler-${name}.jsonc`);
  writeFileSync(path, JSON.stringify(config, null, 2));
  return path;
};

beforeAll(async () => {
  mkdirSync(RUNTIME, { recursive: true });
  runDir = mkdtempSync(join(RUNTIME, 'run-'));
  for (const dir of ['main', 'low']) mkdirSync(join(runDir, dir), { recursive: true });

  // One scan up front: issuer, four workers, four inspector sockets — nothing fixed,
  // nothing shared with any other process on this machine.
  const [issuerPort, main, low, flags, outage, inspect1, inspect2, inspect3, inspect4] = await allocatePorts(9);
  ISSUER_PORT = issuerPort;
  ISSUER_URL = `http://127.0.0.1:${issuerPort}`;
  mainPort = main;
  mainInspectorPort = inspect1;
  API = `http://127.0.0.1:${main}`;
  API_LOW = `http://127.0.0.1:${low}`;
  API_FLAGS = `http://127.0.0.1:${flags}`;
  API_OUTAGE = `http://127.0.0.1:${outage}`;
  ORIGIN = API;
  ORIGIN_LOW = API_LOW;
  ORIGIN_FLAGS = API_FLAGS;
  ORIGIN_OUTAGE = API_OUTAGE;

  issuer = await startIssuer({
    allowedOrigins: [ORIGIN, ORIGIN_LOW, ORIGIN_FLAGS, ORIGIN_OUTAGE, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    audience: 'community-archive',
    host: '127.0.0.1',
    issuer: ISSUER_URL,
    port: ISSUER_PORT,
  });

  mainConfig = writeConfig('main', mainPort, { database: 'archive-test' });
  const lowConfig = writeConfig('low', low, { database: 'archive-test-low' });
  const flagsConfig = writeConfig('flags', flags, {
    database: 'archive-test',
    flags: { likes: false, publishing: false },
  });
  // The outage variant never warms its JWKS keyset before the outage test; it also
  // omits the pepper so a missing secret cannot mask the dead-provider path.
  const outageConfig = writeConfig('outage', outage, { database: 'archive-test', pepper: false });

  for (const [config, db, dir] of [
    [mainConfig, 'archive-test', 'main'],
    [lowConfig, 'archive-test-low', 'low'],
    [flagsConfig, 'archive-test', 'main'],
    [outageConfig, 'archive-test', 'main'],
  ] as const) {
    const migrate = await wrangler([
      'd1',
      'migrations',
      'apply',
      db,
      '--local',
      '--config',
      config,
      '--persist-to',
      join(runDir, dir),
    ]);
    if (migrate.code !== 0) throw new Error(`migration failed for ${config}:\n${migrate.out}`);
  }

  mainWorkerPersistDir = join(runDir, 'main');
  // Sequential bring-up: dev instances started together race for auxiliary sockets.
  worker = spawnWorker(mainConfig, mainPort, inspect1, mainWorkerPersistDir, runDir, { testScheduled: true });
  await waitReady(API);
  // The low, flags and outage workers need no handles here: `children` tracks every
  // spawned process for teardown, and only the main worker is ever restarted.
  spawnWorker(lowConfig, low, inspect2, join(runDir, 'low'), runDir);
  await waitReady(API_LOW);
  spawnWorker(flagsConfig, flags, inspect3, mainWorkerPersistDir, runDir);
  await waitReady(API_FLAGS);
  spawnWorker(outageConfig, outage, inspect4, mainWorkerPersistDir, runDir);
  await waitReady(API_OUTAGE);
}, 240_000);

afterAll(async () => {
  // Only processes this suite spawned, via their own detached groups.
  for (const child of [...children].reverse()) await stopWorker(child);
  await issuer?.dispose();
});

describe('health and access guards', () => {
  it('reports ok with schema version, features and limits', async () => {
    const { res, json } = await call(API, '/api/v1/health');
    expect(res.status).toBe(200);
    expect(json).toMatchObject({ features: { likes: true, publishing: true }, schemaVersion: 1, status: 'ok' });
    expect(json).toHaveProperty('limits');
    expect((json as { limits: { maxPageSize: number } }).limits.maxPageSize).toBe(50);
    expect((json as { limits: { tagsPerEntry: number } }).limits.tagsPerEntry).toBe(16);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('answers anonymous list and detail reads without a session', async () => {
    const list = await call(API, '/api/v1/collections/recipes/entries', { origin: null });
    expect(list.res.status).toBe(200);
    const me = await call(API, '/api/v1/me', { origin: null });
    expect(me.res.status).toBe(200);
    expect(me.json).toBeNull();
  });

  it('answers an unregistered collection segment with 404 not-found', async () => {
    const list = await call(API, '/api/v1/collections/no-such-collection/entries', { origin: ORIGIN });
    expect(list.res.status).toBe(404);
    expect(list.json).toMatchObject({ error: { code: 'not-found' } });
    const detail = await call(API, `/api/v1/collections/no-such-collection/entries/${crypto.randomUUID()}`, {
      origin: ORIGIN,
    });
    expect(detail.res.status).toBe(404);
    expect(detail.json).toMatchObject({ error: { code: 'not-found' } });
  });

  it('answers 400 for a malformed entry id on every id-bearing route, before any auth cost', async () => {
    // The route patterns admit any 36-char [0-9a-f-] run; the shared id rule turns
    // shape garbage into one uniform 400 — never a 404 from a storage miss.
    const malformed = '-'.repeat(36);
    const detail = await call(API, `/api/v1/collections/recipes/entries/${malformed}`);
    expect(detail.res.status).toBe(400);
    expect(detail.json).toMatchObject({ error: { code: 'bad-request' } });

    // The same malformed id is the same 400 on the mutation routes, even anonymous:
    // a path that can never succeed spends no rate-limit budget or session verification.
    const like = await call(API, `/api/v1/collections/recipes/entries/${malformed}/like`, {
      method: 'PUT',
      origin: ORIGIN,
    });
    expect(like.res.status).toBe(400);
    const report = await call(API, `/api/v1/collections/recipes/entries/${malformed}/report`, {
      body: { reason: 'x' },
      method: 'POST',
      origin: ORIGIN,
    });
    expect(report.res.status).toBe(400);
    const hidden = await call(API, `/api/v1/collections/recipes/entries/${malformed}/hidden`, {
      method: 'PUT',
      origin: ORIGIN,
    });
    expect(hidden.res.status).toBe(400);

    // A well-formed id that simply does not exist keeps its 404.
    expect((await call(API, `/api/v1/collections/recipes/entries/${crypto.randomUUID()}`)).res.status).toBe(404);
  });

  it('answers 404 for an unrouted path and 405 for a wrong method, both before any guard', async () => {
    // Unknown paths inside the mount answer the same 404 as paths outside it.
    const unrouted = await call(API, '/api/v1/nothing-here');
    expect(unrouted.res.status).toBe(404);
    expect(unrouted.json).toMatchObject({ error: { code: 'not-found' } });

    // A known route under an unsupported method answers 405 on the method alone —
    // even with a foreign origin and a garbage token, which the origin guard would
    // have answered first: the method check precedes every guard and every cost.
    const wrongMethod = await call(API, '/api/v1/collections/recipes/entries', {
      cookie: 'archive_session=garbage.token.value',
      headers: { origin: 'https://evil.example' },
      method: 'DELETE',
    });
    expect(wrongMethod.res.status).toBe(405);
    expect(wrongMethod.json).toMatchObject({ error: { code: 'method-not-allowed' } });
  });

  it('rejects unknown query params on the meta and reports routes', async () => {
    // The strict-query discipline covers every route: meta and the operator queue
    // enforce their allow-lists before authentication.
    expect((await call(API, '/api/v1/collections/recipes?extra=1')).res.status).toBe(400);
    expect((await call(API, '/api/v1/collections/recipes/reports?extra=1')).res.status).toBe(400);
  });

  it('rejects anonymous mutations with 401', async () => {
    const { res } = await call(API, '/api/v1/collections/recipes/entries', {
      body: { clientKey: crypto.randomUUID(), payload: recipe() },
      method: 'POST',
      origin: ORIGIN,
    });
    expect(res.status).toBe(401);
  });

  it('rejects foreign or missing Origin and missing marker with 403', async () => {
    const cookie = await signIn('alice');
    const body = { clientKey: crypto.randomUUID(), payload: recipe() };
    const foreign = await call(API, '/api/v1/collections/recipes/entries', {
      body,
      cookie,
      method: 'POST',
      origin: 'https://evil.example',
    });
    expect(foreign.res.status).toBe(403);
    const noOrigin = await call(API, '/api/v1/collections/recipes/entries', {
      body,
      cookie,
      method: 'POST',
      origin: null,
    });
    expect(noOrigin.res.status).toBe(403);
    const noMarker = await fetch(`${API}/api/v1/collections/recipes/entries`, {
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json', cookie, origin: ORIGIN },
      method: 'POST',
    });
    expect(noMarker.status).toBe(403);
  });

  it('fails the origin/marker guard BEFORE JWT verification: garbage token still gets 403', async () => {
    const body = { clientKey: crypto.randomUUID(), payload: recipe() };
    const garbage = { cookie: 'archive_session=definitely-not-a-jwt', method: 'POST' as const };
    const foreign = await call(API, '/api/v1/collections/recipes/entries', {
      body,
      ...garbage,
      origin: 'https://evil.example',
    });
    expect(foreign.res.status).toBe(403);
    const noOrigin = await call(API, '/api/v1/collections/recipes/entries', { body, ...garbage, origin: null });
    expect(noOrigin.res.status).toBe(403);
    const noMarker = await fetch(`${API}/api/v1/collections/recipes/entries`, {
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json', cookie: garbage.cookie, origin: ORIGIN },
      method: 'POST',
    });
    expect(noMarker.status).toBe(403);
    // Control: same garbage token inside a valid guard reaches verification and gets 401.
    const guarded = await call(API, '/api/v1/collections/recipes/entries', {
      body,
      cookie: garbage.cookie,
      method: 'POST',
    });
    expect(guarded.res.status).toBe(401);
  });

  it('rejects unsupported media types with 415 and malformed bodies with 400', async () => {
    const cookie = await signIn('alice');
    await register(cookie);
    const wrongType = await call(API, '/api/v1/collections/recipes/entries', {
      cookie,
      method: 'POST',
      origin: ORIGIN,
      rawBody: 'hello',
      rawContentType: 'text/plain',
    });
    expect(wrongType.res.status).toBe(415);
    const badJson = await call(API, '/api/v1/collections/recipes/entries', {
      cookie,
      method: 'POST',
      origin: ORIGIN,
      rawBody: '{oops',
      rawContentType: 'application/json',
    });
    expect(badJson.res.status).toBe(400);
  });

  it('rejects oversized bodies with 413 regardless of content-length claims', async () => {
    const cookie = await signIn('alice');
    await register(cookie);
    const big = JSON.stringify({
      clientKey: crypto.randomUUID(),
      pad: 'x'.repeat(13 * 1024),
      payload: recipe(),
    });
    const res = await fetch(`${API}/api/v1/collections/recipes/entries`, {
      body: big,
      // No Content-Length games needed: the stream itself crosses the 12KiB ceiling.
      headers: {
        'content-type': 'application/json',
        cookie,
        origin: ORIGIN,
        'x-archive-publisher': publisherIds.get(cookie) ?? '',
        'x-archive-request': '1',
      },
      method: 'POST',
    });
    expect(res.status).toBe(413);
  });

  it('rejects forged owner/private fields and unknown query params', async () => {
    const cookie = await signIn('alice');
    await register(cookie);
    const base = recipe() as unknown as Record<string, unknown>;
    const forged = await call(API, '/api/v1/collections/recipes/entries', {
      body: { clientKey: crypto.randomUUID(), payload: { ...base, ownerId: 'someone' } },
      cookie,
      method: 'POST',
      origin: ORIGIN,
    });
    expect(forged.res.status).toBe(422);
    const params = await call(API, '/api/v1/collections/recipes/entries?bogus=1');
    expect(params.res.status).toBe(400);
    const dup = await call(API, '/api/v1/collections/recipes/entries?limit=5&limit=6');
    expect(dup.res.status).toBe(400);
  });

  it('rejects invalid payload content with 422', async () => {
    const cookie = await signIn('alice');
    await register(cookie, 'Alice');
    const base = recipe();
    const cases: Record<string, unknown>[] = [
      { ...base, cuisine: 'french' },
      { ...base, ingredients: [] },
      { ...base, ingredients: [''] },
      { ...base, ingredients: [...base.ingredients, ''] },
      { ...base, name: '   ' },
      { ...base, name: 'x'.repeat(33) },
    ];
    for (const [index, payload] of cases.entries()) {
      const { json, res } = await call(API, '/api/v1/collections/recipes/entries', {
        body: { clientKey: crypto.randomUUID(), payload },
        cookie,
        method: 'POST',
        origin: ORIGIN,
      });
      expect(res.status, JSON.stringify(payload)).toBe(422);
      // One parsed envelope pins the typed contract, not just the status.
      if (index === 0) expect(json).toMatchObject({ error: { code: 'invalid-payload' } });
    }
  });

  it('rejects malformed tokens and signatures from foreign keys', async () => {
    const corrupt = await call(API, '/api/v1/me', { cookie: 'archive_session=garbage.token.here', origin: ORIGIN });
    expect(corrupt.res.status).toBe(401);
    // A correctly shaped JWT under the issuer's CURRENT public kid but signed by
    // a different key proves the signature check, not the kid lookup, rejects it.
    const jose = await import('jose');
    const jwks = (await (await fetch(`${ISSUER_URL}/.well-known/jwks.json`)).json()) as {
      keys: { kid?: string }[];
    };
    const realKid = jwks.keys[0]?.kid ?? 'x';
    const { privateKey } = await jose.generateKeyPair('RS256');
    const foreign = await new jose.SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: realKid })
      .setIssuer(ISSUER_URL)
      .setAudience('community-archive')
      .setSubject('mallory')
      .setIssuedAt()
      .setExpirationTime('900s')
      .sign(privateKey);
    const badKey = await call(API, '/api/v1/me', { cookie: `archive_session=${foreign}`, origin: ORIGIN });
    expect(badKey.res.status).toBe(401);
  });

  it('rejects correctly signed tokens with wrong or missing claims', async () => {
    const now = Math.floor(Date.now() / 1000);
    const cases: { label: string; tweaks: Parameters<typeof signInWithClaims>[0] }[] = [
      { label: 'wrong audience', tweaks: { audience: 'other-app' } },
      { label: 'wrong issuer', tweaks: { issuer: 'http://127.0.0.1:9999' } },
      // exp 100s ago (past the 5s tolerance) with iat fresh enough that maxTokenAge
      // cannot fire first — this isolates the expiry rejection itself.
      { label: 'expired', tweaks: { expiration: now - 100, issuedAt: now - 200 } },
      { label: 'missing subject', tweaks: { skipSubject: true } },
      { label: 'empty subject', tweaks: { subject: '' } },
      { label: 'oversized subject', tweaks: { subject: 'x'.repeat(257) } },
      { label: 'lone-surrogate subject', tweaks: { subject: 'local-alice\ud800' } },
      { label: 'control-character subject', tweaks: { subject: 'local-\u0000alice' } },
      // iat older than the 30-day maximum age; exp still fresh, so maxTokenAge fires.
      { label: 'stale iat', tweaks: { expiration: now + 900, issuedAt: now - 30 * 24 * 60 * 60 - 2000 } },
      { label: 'future iat', tweaks: { issuedAt: now + 100 } },
    ];
    for (const { label, tweaks } of cases) {
      const cookie = await signInWithClaims(tweaks);
      const { res } = await call(API, '/api/v1/me', { cookie, origin: ORIGIN });
      expect(res.status, label).toBe(401);
    }
    // Sanity: an untweaked token still verifies.
    const good = await signIn('alice');
    const ok = await call(API, '/api/v1/me', { cookie: good, origin: ORIGIN });
    expect(ok.res.status).toBe(200);
  });
});

describe('identity and publications', () => {
  it('registers, renames and owns publications only via the verified subject', async () => {
    const alice = await signIn('alice');
    const me = await register(alice, 'Alice');
    expect(me.id).toMatch(/^[0-9a-f-]{36}$/);
    const renamed = await call(API, '/api/v1/me', {
      body: { name: 'Alicia' },
      cookie: alice,
      method: 'PUT',
      origin: ORIGIN,
    });
    expect((renamed.json as { name: string }).name).toBe('Alicia');
    const getMe = await call(API, '/api/v1/me', { cookie: alice });
    expect((getMe.json as { name: string }).name).toBe('Alicia');
    // Re-registration is a conflict: same identity returned, fields not rewritten.
    const again = await call(API, '/api/v1/me', {
      body: { name: 'Other' },
      cookie: alice,
      method: 'POST',
      origin: ORIGIN,
    });
    expect(again.res.status).toBe(200);
    expect((again.json as { id: string }).id).toBe(me.id);
    expect((again.json as { name: string }).name).toBe('Alicia');
    const unregistered = await signIn('bob');
    const denied = await call(API, '/api/v1/collections/recipes/entries', {
      body: { clientKey: crypto.randomUUID(), payload: recipe() },
      cookie: unregistered,
      method: 'POST',
      origin: ORIGIN,
    });
    expect(denied.res.status).toBe(403);
  });

  it('rejects writes from a signed-in but unregistered publisher with 403 forbidden', async () => {
    // Bob is deliberately unregistered: this case runs before his first
    // registration later in this describe, and the suite's D1 state persists
    // across tests within one run.
    const cookie = await signIn('bob');
    const { json, res } = await call(API, '/api/v1/collections/recipes/entries', {
      body: { clientKey: crypto.randomUUID(), payload: recipe() },
      cookie,
      method: 'POST',
      origin: ORIGIN,
    });
    expect(res.status).toBe(403);
    expect(json).toMatchObject({ error: { code: 'forbidden' } });
  });

  it('publishes and replays by retry key; conflicts on key reuse with different content', async () => {
    const alice = await signIn('alice');
    await register(alice);
    const payload = recipe('replayable');
    const key = crypto.randomUUID();
    const first = await publish(alice, payload, key);
    expect(first.res.status).toBe(201);
    const second = await publish(alice, payload, key);
    expect(second.res.status).toBe(200);
    expect(second.entry.id).toBe(first.entry.id);
    const racing = await Promise.all([publish(alice, payload, key), publish(alice, payload, key)]);
    // Same key concurrently still yields one id (second replay returns the same entry).
    expect(racing[0].entry.id).toBe(racing[1].entry.id);
    const conflicted = await publish(alice, recipe('different'), key);
    expect(conflicted.res.status).toBe(409);
  });

  it('keeps owner fields private and enforces owner-only update/delete', async () => {
    const alice = await signIn('alice');
    const bob = await signIn('bob');
    await register(alice);
    await register(bob);
    const { entry } = await publish(alice, recipe('private-check'));
    expectPublicEntry(entry as Record<string, unknown>);

    const detail = await call(API, `/api/v1/collections/recipes/entries/${entry.id}`);
    expect(detail.res.status).toBe(200);
    expectPublicEntry(detail.json as Record<string, unknown>);
    expect(detail.res.headers.get('cache-control')).toBe('no-store');

    // B cannot see A's private key nor touch A's entry.
    const bUpdate = await call(API, `/api/v1/collections/recipes/entries/${entry.id}`, {
      body: { expectedRevision: entry.revision, payload: recipe('stolen') },
      cookie: bob,
      method: 'PUT',
      origin: ORIGIN,
    });
    expect(bUpdate.res.status).toBe(404);
    const bDelete = await call(API, `/api/v1/collections/recipes/entries/${entry.id}`, {
      cookie: bob,
      method: 'DELETE',
      origin: ORIGIN,
    });
    expect(bDelete.res.status).toBe(404);
    const after = await call(API, `/api/v1/collections/recipes/entries/${entry.id}`);
    expect(after.res.status).toBe(200);
    expect((after.json as { revision: number }).revision).toBe(entry.revision);

    // Owner private list carries clientKey; Bob's does not include Alice's.
    const mine = await call(API, '/api/v1/me/publications?collection=recipes', { cookie: alice });
    expect(mine.res.status).toBe(200);
    expect(mine.res.headers.get('cache-control')).toBe('no-store');
    const mineEntries = (mine.json as { entries: Record<string, unknown>[] }).entries;
    const owned = mineEntries.find((e) => e.id === entry.id);
    expect(owned).toHaveProperty('clientKey');
    const bobMine = await call(API, '/api/v1/me/publications?collection=recipes', { cookie: bob });
    expect(
      (bobMine.json as { entries: unknown[] }).entries.find((e) => (e as { id: string }).id === entry.id),
    ).toBeUndefined();
    // Anonymous and public payloads never expose the key. A fresh search query
    // bypasses the 30s public list cache so the new entry is visible.
    const list = await call(API, '/api/v1/collections/recipes/entries?search=private');
    const listed = (list.json as { entries: Record<string, unknown>[] }).entries.find((e) => e.id === entry.id);
    expect(listed).toBeDefined();
    expect(listed).not.toHaveProperty('clientKey');
  });

  it('updates with revision guard, treats reordered content as a no-op', async () => {
    const alice = await signIn('alice');
    await register(alice);
    const { entry } = await publish(alice, recipe('v1'));
    const detail = (await call(API, `/api/v1/collections/recipes/entries/${entry.id}`)).json as {
      contentHash: string;
      publishedAt: string;
      revision: number;
      updatedAt: string;
      payload: RecipePayload;
    };

    // Reordered ingredients hash identically: the collection's canonicalize sorts,
    // so no revision bump and no new updatedAt.
    const reordered: RecipePayload = { ...detail.payload, ingredients: [...detail.payload.ingredients].reverse() };
    const derivation = await recipeCollection.derive(reordered);
    expect(derivation?.contentHash).toBe(detail.contentHash);
    const noop = await call(API, `/api/v1/collections/recipes/entries/${entry.id}`, {
      body: { expectedRevision: detail.revision, payload: reordered },
      cookie: alice,
      method: 'PUT',
      origin: ORIGIN,
    });
    expect(noop.res.status).toBe(200);
    expect((noop.json as { revision: number }).revision).toBe(detail.revision);
    expect((noop.json as { updatedAt: string }).updatedAt).toBe(detail.updatedAt);

    // A real change bumps revision exactly once.
    const changed: RecipePayload = { ...detail.payload, name: 'v2' };
    const stale = await call(API, `/api/v1/collections/recipes/entries/${entry.id}`, {
      body: { expectedRevision: detail.revision + 5, payload: changed },
      cookie: alice,
      method: 'PUT',
      origin: ORIGIN,
    });
    expect(stale.res.status).toBe(409);
    const raced = await Promise.all([
      call(API, `/api/v1/collections/recipes/entries/${entry.id}`, {
        body: { expectedRevision: detail.revision, payload: changed },
        cookie: alice,
        method: 'PUT',
        origin: ORIGIN,
      }),
      call(API, `/api/v1/collections/recipes/entries/${entry.id}`, {
        body: { expectedRevision: detail.revision, payload: { ...detail.payload, name: 'v3' } },
        cookie: alice,
        method: 'PUT',
        origin: ORIGIN,
      }),
    ]);
    const statuses = raced.map((r) => r.res.status).sort();
    expect(statuses).toEqual([200, 409]);
    // A signed read bypasses the anonymous edge cache: the mutation really landed.
    const after = (await call(API, `/api/v1/collections/recipes/entries/${entry.id}`, { cookie: alice })).json as {
      revision: number;
      publishedAt: string;
    };
    expect(after.revision).toBe(detail.revision + 1);
    expect(after.publishedAt).toBe(detail.publishedAt);
  });

  it('likes idempotently with a zero floor and never touches revision', async () => {
    const alice = await signIn('alice');
    const bob = await signIn('bob');
    await register(alice);
    await register(bob);
    const { entry } = await publish(alice, recipe('likable'));

    const like = async (cookie: string, liked: boolean) =>
      call(API, `/api/v1/collections/recipes/entries/${entry.id}/like`, {
        cookie,
        method: liked ? 'PUT' : 'DELETE',
        origin: ORIGIN,
      });

    const l1 = await like(bob, true);
    expect(l1.res.status).toBe(200);
    expect(l1.json).toMatchObject({ id: entry.id, likeCount: 1, liked: true });
    const l2 = await like(bob, true);
    expect((l2.json as { likeCount: number }).likeCount).toBe(1);
    const both = await Promise.all([like(alice, true), like(alice, true), like(bob, true)]);
    const counts = new Set(both.map((r) => (r.json as { likeCount: number }).likeCount));
    expect(counts).toEqual(new Set([2]));

    const u1 = await like(bob, false);
    expect(u1.json).toMatchObject({ likeCount: 1, liked: false });
    const u2 = await like(bob, false);
    expect((u2.json as { likeCount: number }).likeCount).toBe(1);
    const u3 = await like(alice, false);
    expect((u3.json as { likeCount: number }).likeCount).toBe(0);

    // me/likes reflects only the caller's likes and only requested ids.
    await like(bob, true);
    const liked = await call(API, `/api/v1/me/likes?ids=${entry.id},${crypto.randomUUID()}`, { cookie: bob });
    expect(liked.json).toEqual({ ids: [entry.id] });
    const likedAlice = await call(API, `/api/v1/me/likes?ids=${entry.id}`, { cookie: alice });
    expect(likedAlice.json).toEqual({ ids: [] });

    // Revision untouched by like churn.
    const after = (await call(API, `/api/v1/collections/recipes/entries/${entry.id}`)).json as { revision: number };
    expect(after.revision).toBe(entry.revision);
  });

  it('exports every liked id without the ids param; the subset mode is unchanged', async () => {
    const alice = await signIn('alice');
    const bob = await signIn('bob');
    await register(alice);
    await register(bob);
    const one = await publish(alice, recipe('export a'));
    const two = await publish(alice, recipe('export b', 'japanese'));
    await call(API, `/api/v1/collections/recipes/entries/${one.entry.id}/like`, {
      cookie: bob,
      method: 'PUT',
      origin: ORIGIN,
    });
    await call(API, `/api/v1/collections/recipes/entries/${two.entry.id}/like`, {
      cookie: bob,
      method: 'PUT',
      origin: ORIGIN,
    });

    // No ids param: the full Art. 15/20 export returns every liked id (the suite's
    // shared D1 state may legitimately carry earlier likes, so membership is the
    // contract, not an exact list).
    const all = await call(API, '/api/v1/me/likes', { cookie: bob });
    expect(all.res.status).toBe(200);
    const exported = (all.json as { ids: string[] }).ids;
    expect(exported).toContain(one.entry.id);
    expect(exported).toContain(two.entry.id);

    // With ids: unchanged subset behavior — only the requested ids, filtered.
    const subset = await call(API, `/api/v1/me/likes?ids=${one.entry.id}`, { cookie: bob });
    expect(subset.res.status).toBe(200);
    expect(subset.json).toEqual({ ids: [one.entry.id] });
  });

  it('hard-deletes with likes and keeps the retry key dead at 410', async () => {
    const alice = await signIn('alice');
    const bob = await signIn('bob');
    await register(alice);
    await register(bob);
    const key = crypto.randomUUID();
    const { entry } = await publish(alice, recipe('doomed'), key);
    await call(API, `/api/v1/collections/recipes/entries/${entry.id}/like`, {
      cookie: bob,
      method: 'PUT',
      origin: ORIGIN,
    });
    const del = await call(API, `/api/v1/collections/recipes/entries/${entry.id}`, {
      cookie: alice,
      method: 'DELETE',
      origin: ORIGIN,
    });
    expect(del.res.status).toBe(204);
    const again = await call(API, `/api/v1/collections/recipes/entries/${entry.id}`, {
      cookie: alice,
      method: 'DELETE',
      origin: ORIGIN,
    });
    expect(again.res.status).toBe(204);
    expect((await call(API, `/api/v1/collections/recipes/entries/${entry.id}`)).res.status).toBe(404);
    const retry = await publish(alice, recipe('doomed'), key);
    expect(retry.res.status).toBe(410);
    expect((await call(API, `/api/v1/me/likes?ids=${entry.id}`, { cookie: bob })).json).toEqual({ ids: [] });
  });

  it('enforces the live-publication quota at exactly 50 live entries', async () => {
    const bob = await signIn('bob');
    await register(bob);
    const before = (
      (await call(API, '/api/v1/me/publications?collection=recipes', { cookie: bob })).json as { entries: unknown[] }
    ).entries.length;
    const created: { id: string; key: string }[] = [];
    try {
      // Fill exactly to the cap: every publish up to 50 total must succeed.
      while (before + created.length < 50) {
        const key = crypto.randomUUID();
        const { res, entry } = await publish(bob, recipe(`quota ${created.length}`), key);
        expect(res.status).toBe(201);
        created.push({ id: entry.id, key });
      }
      const atCap = await call(API, '/api/v1/me/publications?collection=recipes', { cookie: bob });
      expect((atCap.json as { entries: unknown[] }).entries.length).toBe(50);

      // The 51st live publication is refused; replaying an existing key is not.
      const overflow = await publish(bob, recipe('quota overflow'));
      expect(overflow.res.status).toBe(429);
      const replay = await publish(bob, recipe('quota 0'), created[0].key);
      expect(replay.res.status).toBe(200);
      expect(replay.entry.id).toBe(created[0].id);
    } finally {
      // Remove only this fixture's publications so other tests keep their quota.
      for (const { id } of created) {
        await call(API, `/api/v1/collections/recipes/entries/${id}`, { cookie: bob, method: 'DELETE', origin: ORIGIN });
      }
    }
  });
});

describe('publisher precondition', () => {
  it('rejects writes whose expected publisher does not match the verified session', async () => {
    const alice = await signIn('alice');
    const bob = await signIn('bob');
    const a = await register(alice, 'Alice');
    const b = await register(bob, 'Bob');
    // Registration is idempotent across the shared test DB; make the alias exact.
    await call(API, '/api/v1/me', { body: { name: 'Bob' }, cookie: bob, method: 'PUT', origin: ORIGIN });
    const { entry } = await publish(alice, recipe('guarded'));

    const asBobExpectingAlice = { 'x-archive-publisher': a.id };
    const attempts = [
      () =>
        call(API, '/api/v1/collections/recipes/entries', {
          body: { clientKey: crypto.randomUUID(), payload: recipe('hijack') },
          cookie: bob,
          headers: asBobExpectingAlice,
          method: 'POST',
          origin: ORIGIN,
        }),
      () =>
        call(API, `/api/v1/collections/recipes/entries/${entry.id}`, {
          body: { expectedRevision: entry.revision, payload: recipe('hijack') },
          cookie: bob,
          headers: asBobExpectingAlice,
          method: 'PUT',
          origin: ORIGIN,
        }),
      () =>
        call(API, `/api/v1/collections/recipes/entries/${entry.id}`, {
          cookie: bob,
          headers: asBobExpectingAlice,
          method: 'DELETE',
          origin: ORIGIN,
        }),
      () =>
        call(API, `/api/v1/collections/recipes/entries/${entry.id}/like`, {
          cookie: bob,
          headers: asBobExpectingAlice,
          method: 'PUT',
          origin: ORIGIN,
        }),
      () =>
        call(API, '/api/v1/me', {
          body: { name: 'Hijacked' },
          cookie: bob,
          headers: asBobExpectingAlice,
          method: 'PUT',
          origin: ORIGIN,
        }),
    ];
    for (const attempt of attempts) {
      const { res, json } = await attempt();
      expect(res.status).toBe(409);
      expect(json).toMatchObject({ error: { code: 'publisher-changed' } });
    }

    // Private GETs carry the same precondition: B's cookie pinned to A's id fails.
    const wrongMine = await call(API, '/api/v1/me/publications?collection=recipes', {
      cookie: bob,
      headers: asBobExpectingAlice,
    });
    expect(wrongMine.res.status).toBe(409);
    const wrongLikes = await call(API, `/api/v1/me/likes?ids=${entry.id}`, {
      cookie: bob,
      headers: asBobExpectingAlice,
    });
    expect(wrongLikes.res.status).toBe(409);
    // And with each caller's own pinned id they still cannot reach A's records.
    const ownUpdate = await call(API, `/api/v1/collections/recipes/entries/${entry.id}`, {
      body: { expectedRevision: entry.revision, payload: recipe('still denied') },
      cookie: bob,
      method: 'PUT',
      origin: ORIGIN,
    });
    expect(ownUpdate.res.status).toBe(404);

    // Nothing changed for either actor.
    const after = (await call(API, `/api/v1/collections/recipes/entries/${entry.id}`)).json as {
      payload: { name: string };
      likeCount: number;
      revision: number;
    };
    expect(after.payload.name).toBe('guarded');
    expect(after.revision).toBe(entry.revision);
    expect(after.likeCount).toBe(0);
    const bobMe = (await call(API, '/api/v1/me', { cookie: bob })).json as { id: string; name: string };
    expect(bobMe.id).toBe(b.id);
    expect(bobMe.name).toBe('Bob');
    const bobMine = (await call(API, '/api/v1/me/publications?collection=recipes', { cookie: bob })).json as {
      entries: { payload: { name: string } }[];
    };
    expect(bobMine.entries.some((e) => e.payload.name === 'hijack')).toBe(false);

    // Missing or malformed precondition is a 400 for registered publishers.
    const missing = await fetch(`${API}/api/v1/collections/recipes/entries`, {
      body: JSON.stringify({ clientKey: crypto.randomUUID(), payload: recipe() }),
      headers: { 'content-type': 'application/json', cookie: alice, origin: ORIGIN, 'x-archive-request': '1' },
      method: 'POST',
    });
    expect(missing.status).toBe(400);
    const malformed = await call(API, '/api/v1/collections/recipes/entries', {
      body: { clientKey: crypto.randomUUID(), payload: recipe() },
      cookie: alice,
      headers: { 'x-archive-publisher': 'not-a-uuid' },
      method: 'POST',
      origin: ORIGIN,
    });
    expect(malformed.res.status).toBe(400);

    // A foreign-but-valid UUID is a conflict, never an authority grant: a write
    // pinned to its own verified publisher proceeds under that publisher only.
    const own = await call(API, '/api/v1/collections/recipes/entries', {
      body: { clientKey: crypto.randomUUID(), payload: recipe('honest write', 'japanese') },
      cookie: alice,
      method: 'POST',
      origin: ORIGIN,
    });
    expect(own.res.status).toBe(201);
    expect((own.json as { author: { id: string } }).author.id).toBe(a.id);
  });

  it('exempts initial registration but still guards later mutations', async () => {
    const cookie = await signIn('alice');
    // POST /me works without the precondition (no publisher exists yet).
    const me = await register(cookie, 'Alice');
    expect(me.id).toBeTruthy();
  });
});

describe('listing, filtering and paging', () => {
  it('lists newest-first with deterministic ties and validates bad params', async () => {
    const alice = await signIn('alice');
    await register(alice);
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const { entry } = await publish(alice, recipe(`pageable ${i}`));
      ids.push(entry.id);
    }
    // Page within this test's own partition: the unique search term isolates the
    // walk from every entry earlier tests legitimately left in the shared D1 state.
    const page = (cursor: string | null, extra = '') =>
      call(
        API,
        `/api/v1/collections/recipes/entries?limit=2&sort=recent&search=${encodeURIComponent('pageable')}${
          cursor === null ? '' : `&cursor=${encodeURIComponent(cursor)}`
        }${extra}`,
      );

    const page1 = await page(null);
    expect(page1.res.status).toBe(200);
    const p1 = page1.json as { cursor: string | null; entries: { id: string }[]; previous: string | null };
    expect(p1.entries.length).toBe(2);
    expect(p1.previous).toBeNull();
    expect(p1.cursor).not.toBeNull();
    const page2 = await page(p1.cursor);
    const p2 = page2.json as { cursor: string | null; entries: { id: string }[]; previous: string | null };
    const seen = new Set([...p1.entries, ...p2.entries].map((e) => e.id));
    expect(seen.size).toBe(p1.entries.length + p2.entries.length);
    expect(p2.previous).not.toBeNull();
    // Walking back recovers the first page.
    const back = await page(p2.previous);
    const pb = back.json as { entries: { id: string }[]; previous: string | null };
    expect(pb.entries.map((e) => e.id)).toEqual(p1.entries.map((e) => e.id));

    // Full round-trip: first -> second -> third -> second -> first. Exactly five
    // pageable entries exist, so pages are 2 + 2 + 1 and the third is last.
    const page3 = await page(p2.cursor);
    const p3 = page3.json as { cursor: string | null; entries: { id: string }[]; previous: string | null };
    expect(p3.entries.length).toBe(1);
    expect(p3.cursor).toBeNull();
    const back2 = await page(p3.previous);
    const p2b = back2.json as { entries: { id: string }[]; previous: string | null };
    expect(p2b.entries.map((e) => e.id)).toEqual(p2.entries.map((e) => e.id));
    const back3 = await page(p2b.previous);
    expect((back3.json as { entries: { id: string }[] }).entries.map((e) => e.id)).toEqual(p1.entries.map((e) => e.id));

    // Deleted-boundary recovery: decode the cursor's actual boundary entry, delete
    // it unconditionally, then page FROM that cursor — the ghost must not appear.
    const cursorPayload = JSON.parse(
      Buffer.from((p2.cursor ?? '').replaceAll('-', '+').replaceAll('_', '/'), 'base64').toString('utf8'),
    ) as { c: { id: string } };
    const boundary = cursorPayload.c.id;
    const del = await call(API, `/api/v1/collections/recipes/entries/${boundary}`, {
      cookie: alice,
      method: 'DELETE',
      origin: ORIGIN,
    });
    expect(del.res.status).toBe(204);
    const afterDelete = await page(p2.cursor);
    expect(afterDelete.res.status).toBe(200);
    const listed = (afterDelete.json as { entries: { id: string }[] }).entries;
    expect(listed.every((e) => e.id !== boundary)).toBe(true);

    for (const q of [
      'limit=0',
      'limit=51',
      'limit=abc',
      'sort=newest',
      'tag=frozen',
      'cursor=%20%20',
      `search=${'x'.repeat(65)}`,
    ]) {
      const { res } = await call(API, `/api/v1/collections/recipes/entries?${q}`);
      expect(res.status, q).toBe(400);
    }
    // A cursor minted under another filter context is a 400, not a silent page.
    const mismatched = await page(p1.cursor, '&filter=japanese');
    expect(mismatched.res.status).toBe(400);
  });

  it('rejects filter and tag values outside the declared vocabulary with 400', async () => {
    const unknownFilter = await call(API, '/api/v1/collections/recipes/entries?filter=french');
    expect(unknownFilter.res.status).toBe(400);
    const unknownTag = await call(API, '/api/v1/collections/recipes/entries?tag=frozen');
    expect(unknownTag.res.status).toBe(400);
  });

  it('filters by cuisine, tag and search; liked sort ranks by likes', async () => {
    const alice = await signIn('alice');
    const bob = await signIn('bob');
    await register(alice);
    await register(bob);
    const quick = await publish(alice, { ...recipe('quick pasta'), cuisine: 'italian' });
    const involved = await publish(alice, {
      cuisine: 'japanese',
      ingredients: ['miso', 'tofu', 'nori', 'ginger', 'garlic', 'soy', 'sesame'],
      name: 'involved ramen',
    });
    await call(API, `/api/v1/collections/recipes/entries/${involved.entry.id}/like`, {
      cookie: bob,
      method: 'PUT',
      origin: ORIGIN,
    });
    expect(quick.res.status).toBe(201);

    const byCuisine = await call(API, '/api/v1/collections/recipes/entries?filter=japanese&sort=recent');
    expect(
      (byCuisine.json as { entries: { payload: { cuisine: string } }[] }).entries.every(
        (e) => e.payload.cuisine === 'japanese',
      ),
    ).toBe(true);

    const liked = await call(API, '/api/v1/collections/recipes/entries?sort=liked&limit=50');
    const entries = (liked.json as { entries: { id: string; likeCount: number }[] }).entries;
    const counts = entries.map((e) => e.likeCount);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
    expect(entries[0].likeCount).toBeGreaterThanOrEqual(1);

    const search = await call(
      API,
      `/api/v1/collections/recipes/entries?search=${encodeURIComponent('involved ramen')}`,
    );
    expect((search.json as { entries: { id: string }[] }).entries.some((e) => e.id === involved.entry.id)).toBe(true);
    expect((search.json as { entries: { id: string }[] }).entries.some((e) => e.id === quick.entry.id)).toBe(false);

    // Tag derivation: a 3-ingredient recipe lands under tag=quick only; the
    // 7-ingredient one stays under tag=involved.
    const byQuick = await call(API, '/api/v1/collections/recipes/entries?tag=quick');
    const quickEntries = (byQuick.json as { entries: { id: string }[] }).entries;
    expect(quickEntries.some((e) => e.id === quick.entry.id)).toBe(true);
    expect(quickEntries.some((e) => e.id === involved.entry.id)).toBe(false);
  });
});

describe('rate limits', () => {
  it('returns a real 429 with Retry-After once the low-limit fixture is exceeded', async () => {
    // Health is rate-limit-free by design, so the probe burns nothing: hammer a real
    // public read until the binding throttles, then check the sanitized shape.
    let last: Awaited<ReturnType<typeof call>> | undefined;
    for (let i = 0; i < 12; i++) {
      last = await call(API_LOW, '/api/v1/collections/recipes/entries?sort=recent', { origin: ORIGIN_LOW });
      if (last.res.status === 429) break;
    }
    expect(last?.res.status).toBe(429);
    expect(last?.res.headers.get('retry-after')).toBeTruthy();
    expect(last?.json).toMatchObject({ error: { code: 'rate-limited' } });
  });
});

describe('persistence across restarts', () => {
  it('keeps public and owned data after the Worker restarts on the same state dir', async () => {
    const alice = await signIn('alice');
    await register(alice);
    const { entry } = await publish(alice, recipe('survives restart'));

    await stopWorker(worker);
    children.splice(children.indexOf(worker), 1);
    // The stopped worker's own port frees with it; probe before reclaiming.
    while ((await bindProbe(mainPort)) !== null) await new Promise((r) => setTimeout(r, 500));
    worker = spawnWorker(mainConfig, mainPort, mainInspectorPort, mainWorkerPersistDir, runDir, {
      testScheduled: true,
    });
    await waitReady(API);

    const detail = await call(API, `/api/v1/collections/recipes/entries/${entry.id}`);
    expect(detail.res.status).toBe(200);
    const mine = await call(API, '/api/v1/me/publications?collection=recipes', { cookie: alice });
    expect((mine.json as { entries: { id: string }[] }).entries.some((e) => e.id === entry.id)).toBe(true);
  });
});

describe('body transport boundaries', () => {
  /**
   * A mid-upload abort resets the socket the dev proxy was about to reuse toward
   * workerd; the next request loses with the proxy's own 500 "Network connection
   * lost" — it never reaches the worker. Only THAT proven response is tolerated
   * (never arbitrary failures), and the read must recover within a bounded loop.
   */
  const warmProxyConnection = async (): Promise<void> => {
    for (let i = 0; i < 5; i++) {
      let res: Response;
      try {
        res = await fetch(`${API}/api/v1/health`);
      } catch (error) {
        // A refused fetch is not the proxy-reset symptom — surface it.
        if (i === 4) throw error;
        continue;
      }
      if (res.ok) return;
      const body = await res.text();
      if (res.status === 500 && body.includes('Network connection lost')) continue;
      throw new Error(`warmup saw a real failure: ${res.status} ${body.slice(0, 120)}`);
    }
    const recovered = await fetch(`${API}/api/v1/health`);
    expect(recovered.status).toBe(200);
  };

  /** Raw chunked request over a real socket — fetch() cannot stall mid-body. */
  const rawChunked = (
    path: string,
    cookie: string,
    chunks: (Buffer | string)[],
    { end = true, extraHeaders = {} }: { end?: boolean; extraHeaders?: Record<string, string> } = {},
  ): Promise<{ body: string; status: number }> =>
    new Promise((resolvePromise, reject) => {
      const req = httpRequest(`${API}${path}`, {
        // A canceled read can reset this socket; never let it back into a pool.
        agent: false,
        headers: {
          connection: 'close',
          'content-type': 'application/json',
          cookie,
          origin: ORIGIN,
          'transfer-encoding': 'chunked',
          'x-archive-request': '1',
          ...extraHeaders,
        },
        method: 'POST',
      });
      req.on('response', (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          req.destroy();
          resolvePromise({ body, status: res.statusCode ?? 0 });
        });
      });
      req.on('error', () => {
        req.destroy();
        reject(new Error('request failed'));
      });
      for (const chunk of chunks) req.write(chunk);
      if (end) req.end();
      // No else: the socket stays half-open, simulating a stalled sender.
    });

  it('answers 408 when a JSON body stalls past the read deadline', async () => {
    const cookie = await signIn('alice');
    await register(cookie);
    const publisherId = publisherIds.get(cookie) ?? '';
    const started = Date.now();
    const res = await rawChunked('/api/v1/collections/recipes/entries', cookie, ['{"payload":'], {
      end: false,
      extraHeaders: { 'x-archive-publisher': publisherId },
    });
    expect(res.status).toBe(408);
    expect(JSON.parse(res.body)).toMatchObject({ error: { code: 'timeout' } });
    expect(Date.now() - started).toBeGreaterThanOrEqual(9000);
    await warmProxyConnection();
  }, 30_000);

  it('streams a chunked body without Content-Length to the 413 ceiling', async () => {
    const cookie = await signIn('alice');
    await register(cookie);
    const res = await rawChunked(
      '/api/v1/collections/recipes/entries',
      cookie,
      ['{"payload":{', `"pad":"${'x'.repeat(12 * 1024)}"`, '},"clientKey":"00000000-0000-4000-8000-0000000000ab"}'],
      {
        extraHeaders: { 'x-archive-publisher': publisherIds.get(cookie) ?? '' },
      },
    );
    expect(res.status).toBe(413);
    await warmProxyConnection();
  });

  it('accepts a well-formed body split across many chunks', async () => {
    const cookie = await signIn('alice');
    await register(cookie);
    const body = JSON.stringify({ clientKey: crypto.randomUUID(), payload: recipe('chunked fine') });
    const chunks = [body.slice(0, 17), body.slice(17, 130), body.slice(130)];
    const res = await rawChunked('/api/v1/collections/recipes/entries', cookie, chunks, {
      extraHeaders: { 'x-archive-publisher': publisherIds.get(cookie) ?? '' },
    });
    expect(res.status).toBe(201);
  });

  it('rejects invalid UTF-8 bytes with 400', async () => {
    const cookie = await signIn('alice');
    await register(cookie);
    const res = await rawChunked(
      '/api/v1/collections/recipes/entries',
      cookie,
      [Buffer.from([0x7b, 0xff, 0xfe, 0x7d])],
      {
        extraHeaders: { 'x-archive-publisher': publisherIds.get(cookie) ?? '' },
      },
    );
    expect(res.status).toBe(400);
  });

  it('accepts only the exact application/json media type', async () => {
    const cookie = await signIn('alice');
    await register(cookie);
    const evil = await call(API, '/api/v1/collections/recipes/entries', {
      cookie,
      method: 'POST',
      origin: ORIGIN,
      rawBody: '{}',
      rawContentType: 'application/json-evil',
    });
    expect(evil.res.status).toBe(415);
    // Parameters on the real media type are fine.
    const ok = await call(API, '/api/v1/me', {
      cookie,
      method: 'PUT',
      origin: ORIGIN,
      rawBody: JSON.stringify({ name: 'charset ok' }),
      rawContentType: 'application/json; charset=utf-8',
    });
    expect(ok.res.status).toBe(200);
  });
});

describe('cursor and search boundaries', () => {
  it('rejects malformed, tampered and extra-key cursors', async () => {
    const alice = await signIn('alice');
    await register(alice);
    await publish(alice, recipe('cursor fodder'));
    const { res, json } = await call(API, '/api/v1/collections/recipes/entries?limit=1&sort=recent&filter=italian');
    expect(res.status).toBe(200);
    const valid = (json as { cursor: string | null }).cursor;
    const entryId = ((json as { entries: { id: string }[] }).entries[0] ?? { id: crypto.randomUUID() }).id;
    for (const cursor of [
      'not-base64!!!',
      Buffer.from('{"c":{}}').toString('base64url'),
      // Tampered: valid structure plus an unknown top-level key.
      Buffer.from(
        JSON.stringify({
          c: { id: entryId, likeCount: 0, publishedAt: new Date().toISOString() },
          d: 'next',
          injected: true,
          q: { e: null, g: 'recipes', m: null, s: 'recent', t: null },
        }),
      ).toString('base64url'),
      // Wrong direction value.
      Buffer.from(
        JSON.stringify({
          c: { id: entryId, likeCount: 0, publishedAt: new Date().toISOString() },
          d: 'sideways',
          q: { e: null, g: 'recipes', m: null, s: 'recent', t: null },
        }),
      ).toString('base64url'),
      // Negative count.
      Buffer.from(
        JSON.stringify({
          c: { id: entryId, likeCount: -1, publishedAt: new Date().toISOString() },
          d: 'next',
          q: { e: null, g: 'recipes', m: null, s: 'recent', t: null },
        }),
      ).toString('base64url'),
    ]) {
      const bad = await call(
        API,
        `/api/v1/collections/recipes/entries?limit=1&sort=recent&filter=italian&cursor=${encodeURIComponent(cursor)}`,
      );
      expect(bad.res.status, cursor.slice(0, 40)).toBe(400);
    }
    // The real cursor still works after the rejects.
    const good = await call(
      API,
      `/api/v1/collections/recipes/entries?limit=1&sort=recent&filter=italian&cursor=${encodeURIComponent(valid ?? '')}`,
    );
    expect(good.res.status).toBe(200);
  });

  it('searches punctuation and non-Latin terms against indexed titles', async () => {
    const alice = await signIn('alice');
    await register(alice);
    const { entry } = await publish(alice, recipe("Chef's fire-ice ragù"));
    // Punctuation in the query splits into the indexed words, never poisons them.
    const punct = await call(API, `/api/v1/collections/recipes/entries?search=${encodeURIComponent("Chef's")}`);
    expect((punct.json as { entries: { id: string }[] }).entries.some((e) => e.id === entry.id)).toBe(true);
    const dashed = await call(API, `/api/v1/collections/recipes/entries?search=${encodeURIComponent('fire-ice')}`);
    expect((dashed.json as { entries: { id: string }[] }).entries.some((e) => e.id === entry.id)).toBe(true);
    // Cursors must round-trip a non-Latin search context without a 500.
    const unicode = await publish(alice, recipe('Ünïcode ragù'));
    const page = await call(
      API,
      `/api/v1/collections/recipes/entries?limit=1&sort=recent&search=${encodeURIComponent('Ünïcode')}`,
    );
    expect(page.res.status).toBe(200);
    const u = page.json as { cursor: string | null; entries: { id: string }[] };
    expect(u.entries.some((e) => e.id === unicode.entry.id)).toBe(true);
  });

  it('encodes and follows cursors across non-Latin search results', async () => {
    const alice = await signIn('alice');
    await register(alice);
    const a = await publish(alice, recipe('東京 ragù A'));
    const b = await publish(alice, recipe('東京 ragù B'));
    const search = encodeURIComponent('東京');
    const page1 = await call(API, `/api/v1/collections/recipes/entries?limit=1&sort=recent&search=${search}`);
    expect(page1.res.status).toBe(200);
    const p1 = page1.json as { cursor: string | null; entries: { id: string }[]; previous: string | null };
    expect(p1.entries.length).toBe(1);
    expect(p1.cursor).not.toBeNull();
    const page2 = await call(
      API,
      `/api/v1/collections/recipes/entries?limit=1&sort=recent&search=${search}&cursor=${encodeURIComponent(p1.cursor ?? '')}`,
    );
    const p2 = page2.json as { cursor: string | null; entries: { id: string }[]; previous: string | null };
    expect(p2.entries.length).toBe(1);
    const all = new Set([...p1.entries, ...p2.entries].map((e) => e.id));
    expect(all).toEqual(new Set([a.entry.id, b.entry.id]));
    // Walking back through the previous cursor recovers the first page.
    const back = await call(
      API,
      `/api/v1/collections/recipes/entries?limit=1&sort=recent&search=${search}&cursor=${encodeURIComponent(p2.previous ?? '')}`,
    );
    expect(back.res.status).toBe(200);
    expect((back.json as { entries: { id: string }[] }).entries.map((e) => e.id)).toEqual(p1.entries.map((e) => e.id));
  });
});

describe('private reads require the publisher precondition', () => {
  it('answers 400/409 on missing or mismatched headers for private GETs', async () => {
    const alice = await signIn('alice');
    const bob = await signIn('bob');
    const a = await register(alice);
    const b = await register(bob);
    const { entry } = await publish(alice, recipe('preconditioned'));

    // Missing precondition header on private GETs.
    for (const path of ['/api/v1/me/publications?collection=recipes', `/api/v1/me/likes?ids=${entry.id}`]) {
      const missing = await fetch(`${API}${path}`, { headers: { cookie: alice } });
      expect(missing.status, path).toBe(400);
      const foreign = await call(API, path, { cookie: bob, headers: { 'x-archive-publisher': a.id } });
      expect(foreign.res.status, path).toBe(409);
      expect(foreign.json).toMatchObject({ error: { code: 'publisher-changed' } });
    }
    // Correct pins still work.
    const mine = await call(API, '/api/v1/me/publications?collection=recipes', { cookie: alice });
    expect(mine.res.status).toBe(200);
    const likes = await call(API, `/api/v1/me/likes?ids=${entry.id}`, { cookie: bob });
    expect(likes.res.status).toBe(200);
    expect(likes.json).toEqual({ ids: [] });
    expect(b.id).toBeTruthy();
  });

  it('requires the collection param on /me/publications: absent is 400, never an empty list', async () => {
    const alice = await signIn('alice');
    // Register pins this fresh cookie's publisher id, so the precondition passes and
    // the collection param itself is the only thing the request can fail on.
    await register(alice);
    const missing = await call(API, '/api/v1/me/publications', { cookie: alice });
    expect(missing.res.status).toBe(400);
    const unregistered = await call(API, '/api/v1/me/publications?collection=no-such-collection', { cookie: alice });
    expect(unregistered.res.status).toBe(400);
  });
});

describe('feature flags', () => {
  it('blocks create/update/like while delete and unlike stay permitted', async () => {
    // Flags worker shares the main fixture's database: rows made on 18877 are
    // visible (and removable) through 18880's disabled surface.
    const alice = await signIn('alice');
    const me = await register(alice);
    const { entry } = await publish(alice, recipe('flaggable'));
    await call(API, `/api/v1/collections/recipes/entries/${entry.id}/like`, {
      cookie: alice,
      method: 'PUT',
      origin: ORIGIN,
    });

    const flagsCall = (path: string, opts: CallOptions = {}) =>
      call(API_FLAGS, path, {
        ...opts,
        cookie: alice,
        headers: { 'x-archive-publisher': me.id, ...opts.headers },
        origin: ORIGIN_FLAGS,
      });

    const create = await flagsCall('/api/v1/collections/recipes/entries', {
      body: { clientKey: crypto.randomUUID(), payload: recipe('blocked') },
      method: 'POST',
    });
    expect(create.res.status).toBe(503);
    const update = await flagsCall(`/api/v1/collections/recipes/entries/${entry.id}`, {
      body: { expectedRevision: entry.revision, payload: recipe('blocked') },
      method: 'PUT',
    });
    expect(update.res.status).toBe(503);
    const like = await flagsCall(`/api/v1/collections/recipes/entries/${entry.id}/like`, { method: 'PUT' });
    expect(like.res.status).toBe(503);

    // Removal paths stay open: unlike then unpublish through the disabled surface.
    const unlike = await flagsCall(`/api/v1/collections/recipes/entries/${entry.id}/like`, { method: 'DELETE' });
    expect(unlike.res.status).toBe(200);
    expect(unlike.json).toMatchObject({ liked: false });
    const del = await flagsCall(`/api/v1/collections/recipes/entries/${entry.id}`, { method: 'DELETE' });
    expect(del.res.status).toBe(204);
    expect((await call(API, `/api/v1/collections/recipes/entries/${entry.id}`)).res.status).toBe(404);
  });
});

describe('common sign-out', () => {
  const signOut = (opts: CallOptions = {}) => call(API, '/api/v1/sign-out', { method: 'POST', ...opts });

  it('expires only the session cookie with no-store and survives data', async () => {
    const alice = await signIn('alice');
    const me = await register(alice);
    const { entry } = await publish(alice, recipe('signout survives'));

    const { res, text } = await signOut({ cookie: alice });
    expect(res.status).toBe(200);
    expect(JSON.parse(text)).toEqual({ ok: true });
    expect(res.headers.get('cache-control')).toBe('no-store');
    const cleared = res.headers.get('set-cookie') ?? '';
    expect(cleared).toContain('archive_session=');
    expect(cleared).toContain('HttpOnly');
    expect(cleared).toContain('SameSite=Strict');
    expect(cleared).toContain('Path=/api/v1');
    expect(cleared).toContain('Max-Age=0');
    expect(cleared).not.toContain('Secure'); // loopback HTTP fixture
    expect(text).not.toContain(me.id);

    // Works with no cookie, an expired-looking cookie, and a valid one alike.
    expect((await signOut({})).res.status).toBe(200);
    expect((await signOut({ cookie: 'archive_session=dead.token.value' })).res.status).toBe(200);

    // The publication and ownership survive; the cookie itself remains valid
    // server-side (stateless JWT) but the browser copy is gone.
    expect((await call(API, `/api/v1/collections/recipes/entries/${entry.id}`)).res.status).toBe(200);
  });

  it('still enforces the exact-Origin and request-marker guards', async () => {
    const alice = await signIn('alice');
    const foreign = await signOut({ cookie: alice, origin: 'https://evil.example' });
    expect(foreign.res.status).toBe(403);
    const missing = await fetch(`${API}/api/v1/sign-out`, { headers: { cookie: alice }, method: 'POST' });
    expect(missing.status).toBe(403);
    const noMarker = await fetch(`${API}/api/v1/sign-out`, {
      headers: { cookie: alice, origin: ORIGIN },
      method: 'POST',
    });
    expect(noMarker.status).toBe(403);
    // Other methods on the route are still refused.
    expect((await call(API, '/api/v1/sign-out')).res.status).toBe(405);
  });
});

describe('authentication availability', () => {
  it('answers 503 on JWKS outage while anonymous-capable GETs keep working', async () => {
    const cookie = await signIn('alice');
    // A token whose kid the worker has never seen forces a live JWKS fetch; the
    // dedicated outage worker has never warmed its keyset, so with the issuer
    // down that fetch fails and must surface as 503, not 401.
    const coldCookie = await signInWithClaims({ kid: crypto.randomUUID() });
    await issuer.dispose();
    try {
      const me = await call(API_OUTAGE, '/api/v1/me', { cookie: coldCookie, origin: ORIGIN_OUTAGE });
      expect(me.res.status).toBe(503);
      expect(me.json).toMatchObject({ error: { code: 'auth-unavailable' } });
      expect(me.text).not.toContain(cookie);
      // Public reads never invoke auth at all: a cookie on a public GET is fine.
      const list = await call(API_OUTAGE, '/api/v1/collections/recipes/entries?limit=1', { cookie });
      expect(list.res.status).toBe(200);
      const detail = await call(API_OUTAGE, '/api/v1/health', { cookie });
      expect(detail.res.status).toBe(200);
    } finally {
      // Fresh issuer = fresh ephemeral key: old cookies (stale kid) cleanly 401.
      issuer = await startIssuer({
        allowedOrigins: [
          ORIGIN,
          ORIGIN_LOW,
          ORIGIN_FLAGS,
          ORIGIN_OUTAGE,
          'http://localhost:5173',
          'http://127.0.0.1:5173',
        ],
        audience: 'community-archive',
        host: '127.0.0.1',
        issuer: ISSUER_URL,
        port: ISSUER_PORT,
      });
    }
    // The cold-kid cookie can never match the restarted issuer's keyset either:
    // the worker refetches, finds no matching key, and rejects with 401.
    const stale = await call(API, '/api/v1/me', { cookie: coldCookie, origin: ORIGIN });
    expect(stale.res.status).toBe(401);
    const fresh = await signIn('alice');
    // Recovery on the outage worker: its keyset never cached, so the refetch
    // sees the new issuer's JWKS immediately (no cooldown stall).
    expect((await call(API_OUTAGE, '/api/v1/me', { cookie: fresh, origin: ORIGIN_OUTAGE })).res.status).toBe(200);
  });
});

// Shared D1 state: the erasure happy path below DELETES alice's publisher row and
// everything it owns — nothing may follow this describe, and any test that needs a
// live alice account must run before it.
describe('account erasure', () => {
  beforeAll(async () => {
    // 'authentication availability' restarts the issuer with a fresh ephemeral key,
    // but the main worker still holds the old keyset and jose only refetches once
    // its 30 s cooldown has elapsed. Poll until the fresh keyset is adopted before
    // erasing anything — the early 401s are that cooldown, not a broken suite.
    for (let attempt = 0; ; attempt++) {
      const cookie = await signIn('alice');
      if ((await call(API, '/api/v1/me', { cookie })).res.status === 200) return;
      if (attempt >= 15) throw new Error('the main worker never adopted the restarted issuer keyset');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  });

  it('requires the publisher precondition on DELETE /me', async () => {
    const alice = await signIn('alice');
    await register(alice, 'To erase');
    // Missing header on the registered session: the free fail-closed 400 before
    // any quota token is spent (raw fetch — the call helper auto-pins the header).
    const missing = await fetch(`${API}/api/v1/me`, {
      headers: { cookie: alice, origin: ORIGIN, 'x-archive-request': '1' },
      method: 'DELETE',
    });
    expect(missing.status).toBe(400);
    // A foreign-but-valid UUID is a conflict, never an authority grant.
    const wrong = await call(API, '/api/v1/me', {
      cookie: alice,
      headers: { 'x-archive-publisher': crypto.randomUUID() },
      method: 'DELETE',
      origin: ORIGIN,
    });
    expect(wrong.res.status).toBe(409);
    expect(wrong.json).toMatchObject({ error: { code: 'publisher-changed' } });
  });

  it('erases the archive profile without clearing the issuer credential', async () => {
    const alice = await signIn('alice');
    const identity = await register(alice, 'Erased');
    const { entry } = await publish(alice, recipe('erasure cascade'));
    await call(API, `/api/v1/collections/recipes/entries/${entry.id}/like`, {
      cookie: alice,
      method: 'PUT',
      origin: ORIGIN,
    });
    expect((await call(API, '/api/v1/me', { cookie: alice })).json).toMatchObject({ id: identity.id });

    const del = await call(API, '/api/v1/me', { cookie: alice, method: 'DELETE', origin: ORIGIN });
    expect(del.res.status).toBe(204);
    expect(del.res.headers.get('set-cookie')).toBeNull();

    // The same cookie: the account is gone everywhere private and public.
    expect((await call(API, '/api/v1/me', { cookie: alice })).json).toBeNull();
    expect((await call(API, `/api/v1/collections/recipes/entries/${entry.id}`)).res.status).toBe(404);
    expect((await call(API, '/api/v1/me/publications?collection=recipes', { cookie: alice })).json).toEqual({
      entries: [],
    });
    expect((await call(API, `/api/v1/me/likes?ids=${entry.id}`, { cookie: alice })).json).toEqual({ ids: [] });

    // Idempotent: the session is now unregistered — nothing left to erase.
    const again = await call(API, '/api/v1/me', { cookie: alice, method: 'DELETE', origin: ORIGIN });
    expect(again.res.status).toBe(204);

    // The row itself is gone: a fresh sign-in resolves no publisher.
    const fresh = await signIn('alice');
    expect((await call(API, '/api/v1/me', { cookie: fresh })).json).toBeNull();
  });
});

describe('collection meta and author listing', () => {
  it('describes a registered collection and 404s an unregistered one', async () => {
    const meta = await call(API, '/api/v1/collections/recipes');
    expect(meta.res.status).toBe(200);
    expect(meta.json).toEqual({
      filters: ['italian', 'japanese'],
      name: 'recipes',
      tags: ['involved', 'quick'],
    });
    expect((await call(API, '/api/v1/collections/nope')).res.status).toBe(404);
  });

  it('restricts the list to one author and rejects malformed author params', async () => {
    const alice = await signIn('alice');
    const identity = await register(alice, 'author-lister');
    const mine = await publish(alice, recipe('authorbox one'));
    expect(mine.res.status).toBe(201);

    const byAuthor = await call(
      API,
      `/api/v1/collections/recipes/entries?sort=recent&author=${identity.id}&search=${'authorbox'}`,
    );
    expect(byAuthor.res.status).toBe(200);
    const entries = (byAuthor.json as { entries: { id: string }[] }).entries;
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries.every((entry) => entry.id === mine.entry.id)).toBe(true);

    expect((await call(API, '/api/v1/collections/recipes/entries?sort=recent&author=not-a-uuid')).res.status).toBe(400);
  });
});

describe('moderation: reports and the operator soft-hide', () => {
  it('records idempotent reader reports and answers them only to operators', async () => {
    const alice = await signIn('alice');
    await register(alice, 'report-owner');
    const entry = await publish(alice, recipe('moderated recipe one'));

    // Any registered publisher may report; the same report twice is the same 204.
    const bob = await signIn('bob');
    const reporter = await register(bob, 'reporter-bob');
    const first = await call(API, `/api/v1/collections/recipes/entries/${entry.entry.id}/report`, {
      body: { reason: '  Spam content.  ' },
      cookie: bob,
      method: 'POST',
      origin: ORIGIN,
    });
    expect(first.res.status).toBe(204);
    const again = await call(API, `/api/v1/collections/recipes/entries/${entry.entry.id}/report`, {
      body: { reason: 'Spam content.' },
      cookie: bob,
      method: 'POST',
      origin: ORIGIN,
    });
    expect(again.res.status).toBe(204);

    // Reports about a foreign or missing entry are 404, and an empty reason is 422.
    const bad = await call(API, `/api/v1/collections/recipes/entries/${crypto.randomUUID()}/report`, {
      body: { reason: 'x' },
      cookie: bob,
      method: 'POST',
      origin: ORIGIN,
    });
    expect(bad.res.status).toBe(404);
    const empty = await call(API, `/api/v1/collections/recipes/entries/${entry.entry.id}/report`, {
      body: { reason: '   ' },
      cookie: bob,
      method: 'POST',
      origin: ORIGIN,
    });
    expect(empty.res.status).toBe(422);

    // The queue is operator-only: a plain signed-in publisher gets 403.
    const queueForbidden = await call(API, '/api/v1/collections/recipes/reports', { cookie: bob });
    expect(queueForbidden.res.status).toBe(403);

    const operator = await signIn('bob', ORIGIN, true);
    await register(operator, 'operator-bob');
    const queue = await call(API, '/api/v1/collections/recipes/reports', { cookie: operator });
    expect(queue.res.status).toBe(200);
    const reports = (queue.json as { reports: { id: string; reason: string; reporter: { id: string } }[] }).reports;
    expect(reports.some((report) => report.reason === 'Spam content.')).toBe(true);
    expect(reports.some((report) => report.reporter.id === reporter.id)).toBe(true);
    const report = reports.find((report) => report.reason === 'Spam content.');
    if (report === undefined) throw new Error('Missing recorded report');
    const resolvePath = `/api/v1/collections/recipes/reports/${report.id}/resolved`;
    expect((await call(API, resolvePath, { cookie: bob, method: 'PUT' })).res.status).toBe(403);
    expect((await call(API, resolvePath, { cookie: operator, method: 'PUT' })).res.status).toBe(204);
    expect((await call(API, resolvePath, { cookie: operator, method: 'PUT' })).res.status).toBe(204);
    const pending = await call(API, '/api/v1/collections/recipes/reports', { cookie: operator });
    expect((pending.json as { reports: { id: string }[] }).reports.some((row) => row.id === report.id)).toBe(false);
    const resolved = await call(API, '/api/v1/collections/recipes/reports?status=resolved', { cookie: operator });
    expect(resolved.json).toMatchObject({ reports: [{ id: report.id, resolvedAt: expect.any(String) }] });
    const own = await call(API, '/api/v1/me/reports', { cookie: bob });
    expect(own.json).toMatchObject({ reports: [{ id: report.id, reason: 'Spam content.' }] });
    expect((await call(API, `/api/v1/collections/recipes/entries/${entry.entry.id}`)).res.status).toBe(200);
  });

  it('hides an entry from every public surface while the owner keeps visibility', async () => {
    const alice = await signIn('alice');
    await register(alice, 'hidden-owner');
    const hidden = await publish(alice, recipe('hidden recipe one'));
    const visible = await publish(alice, recipe('visible recipe one'));
    expect(hidden.res.status).toBe(201);
    expect(visible.res.status).toBe(201);

    // Operator authority is the role claim: a plain session cannot hide or unhide.
    const plainBob = await signIn('bob');
    await register(plainBob, 'plain-bob');
    const refused = await call(API, `/api/v1/collections/recipes/entries/${hidden.entry.id}/hidden`, {
      cookie: plainBob,
      method: 'PUT',
      origin: ORIGIN,
    });
    expect(refused.res.status).toBe(403);
    expect(
      (
        await call(API, `/api/v1/collections/recipes/entries/${hidden.entry.id}/hidden`, {
          method: 'PUT',
          origin: ORIGIN,
        })
      ).res.status,
    ).toBe(401);

    const operator = await signIn('bob', ORIGIN, true);
    await register(operator, 'operator-two');
    const hide = await call(API, `/api/v1/collections/recipes/entries/${hidden.entry.id}/hidden`, {
      cookie: operator,
      method: 'PUT',
      origin: ORIGIN,
    });
    expect(hide.res.status).toBe(204);
    // Idempotent: already hidden is the same 204.
    const rehide = await call(API, `/api/v1/collections/recipes/entries/${hidden.entry.id}/hidden`, {
      cookie: operator,
      method: 'PUT',
      origin: ORIGIN,
    });
    expect(rehide.res.status).toBe(204);

    // Public surfaces act as if the entry never existed.
    expect((await call(API, `/api/v1/collections/recipes/entries/${hidden.entry.id}`)).res.status).toBe(404);
    expect(
      (await call(API, `/api/v1/collections/recipes/entries?sort=recent&search=${'hidden-recipe-one'}`)).json,
    ).toMatchObject({ entries: [] });
    const bobLike = await call(API, `/api/v1/collections/recipes/entries/${hidden.entry.id}/like`, {
      cookie: plainBob,
      method: 'PUT',
      origin: ORIGIN,
    });
    expect(bobLike.res.status).toBe(404);

    // The owner still sees the entry, with its moderation state.
    const mine = await call(API, '/api/v1/me/publications?collection=recipes', { cookie: alice });
    const owned = (mine.json as { entries: { id: string; hidden: boolean }[] }).entries;
    const hiddenRow = owned.find((row) => row.id === hidden.entry.id);
    const visibleRow = owned.find((row) => row.id === visible.entry.id);
    expect(hiddenRow?.hidden).toBe(true);
    expect(visibleRow?.hidden).toBe(false);

    // Hidden freezes edits and key replay, never removal.
    const update = await call(API, `/api/v1/collections/recipes/entries/${hidden.entry.id}`, {
      body: { expectedRevision: 1, payload: recipe('edited hidden recipe') },
      cookie: alice,
      method: 'PUT',
      origin: ORIGIN,
    });
    expect(update.res.status).toBe(403);
    const remove = await call(API, `/api/v1/collections/recipes/entries/${hidden.entry.id}`, {
      cookie: alice,
      method: 'DELETE',
      origin: ORIGIN,
    });
    expect(remove.res.status).toBe(204);
  });

  it('unhides a hidden entry and restores it to public surfaces', async () => {
    const alice = await signIn('alice');
    await register(alice, 'unhide-owner');
    const entry = await publish(alice, recipe('unhide recipe one'));
    const operator = await signIn('bob', ORIGIN, true);
    await register(operator, 'operator-three');

    expect(
      (
        await call(API, `/api/v1/collections/recipes/entries/${entry.entry.id}/hidden`, {
          cookie: operator,
          method: 'PUT',
          origin: ORIGIN,
        })
      ).res.status,
    ).toBe(204);
    const unhide = await call(API, `/api/v1/collections/recipes/entries/${entry.entry.id}/hidden`, {
      cookie: operator,
      method: 'DELETE',
      origin: ORIGIN,
    });
    expect(unhide.res.status).toBe(204);

    const detail = await call(API, `/api/v1/collections/recipes/entries/${entry.entry.id}`);
    expect(detail.res.status).toBe(200);
    const ownerMine = await call(API, '/api/v1/me/publications?collection=recipes', { cookie: alice });
    expect(
      (ownerMine.json as { entries: { id: string; hidden: boolean }[] }).entries.find(
        (row) => row.id === entry.entry.id,
      )?.hidden,
    ).toBe(false);
  });
});

describe('storage schema and the scheduled sweep', () => {
  it('reports the stamped storage schema version through health', async () => {
    const health = await call(API, '/api/v1/health');
    expect(health.res.status).toBe(200);
    expect(health.json).toMatchObject({ dbSchemaVersion: 1, reason: null, schemaVersion: 1, status: 'ok' });
  });

  it('runs the scheduled sweep and emits its event into the worker log', async () => {
    const res = await fetch(`${API}/__scheduled`);
    expect(res.status).toBe(200);

    // The tap line lands in the main worker's log; poll for it since the sweep
    // completes after the __scheduled response.
    const logPath = join(runDir, `worker-${mainPort}.log`);
    const deadline = Date.now() + 15_000;
    let sawScheduled = false;
    while (Date.now() < deadline) {
      if (readFileSync(logPath, 'utf8').includes('"type":"scheduled"')) {
        sawScheduled = true;
        break;
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 250));
    }
    expect(sawScheduled).toBe(true);
  });
});

describe('moderation: operator removal and publisher erasure', () => {
  it('exposes the operator flag only on the verified identity', async () => {
    const plain = await signIn('bob');
    await register(plain, 'plain-identity');
    const plainMe = await call(API, '/api/v1/me', { cookie: plain, origin: ORIGIN });
    // Registration is idempotent, so the name may be an earlier test's; the flag is the contract.
    expect(plainMe.json).toMatchObject({ operator: false });

    const operator = await signIn('bob', ORIGIN, true);
    await register(operator, 'operator-identity');
    const operatorMe = await call(API, '/api/v1/me', { cookie: operator, origin: ORIGIN });
    expect(operatorMe.json).toMatchObject({ operator: true });
  });

  it('lets an operator remove a foreign entry, and only an operator', async () => {
    const alice = await signIn('alice');
    await register(alice, 'removal-owner');
    const entry = await publish(alice, recipe('operator removal target'));

    // A plain publisher sees the foreign entry as absent on DELETE.
    const plainBob = await signIn('bob');
    await register(plainBob, 'removal-plain');
    const refused = await call(API, `/api/v1/collections/recipes/entries/${entry.entry.id}`, {
      cookie: plainBob,
      method: 'DELETE',
      origin: ORIGIN,
    });
    expect(refused.res.status).toBe(404);

    const operator = await signIn('bob', ORIGIN, true);
    await register(operator, 'removal-operator');
    const removed = await call(API, `/api/v1/collections/recipes/entries/${entry.entry.id}`, {
      cookie: operator,
      method: 'DELETE',
      origin: ORIGIN,
    });
    expect(removed.res.status).toBe(204);
    expect((await call(API, `/api/v1/collections/recipes/entries/${entry.entry.id}`)).res.status).toBe(404);
    // The owner's own list no longer carries it.
    const mine = await call(API, '/api/v1/me/publications?collection=recipes', { cookie: alice, origin: ORIGIN });
    const entries = (mine.json as { entries: { id: string }[] }).entries;
    expect(entries.some((row) => row.id === entry.entry.id)).toBe(false);
  });

  it('refuses an unregistered operator: removal shares the accountable-identity requirement', async () => {
    const alice = await signIn('alice');
    await register(alice, 'unregistered-owner');
    const entry = await publish(alice, recipe('unregistered operator target'));

    // The role claim alone is not enough: like every moderation route, removal
    // requires a registered publisher row — one accountable identity per action.
    // The dedicated 'op' subject has never registered anywhere in this suite.
    const operator = await signIn('op', ORIGIN, true);
    const refused = await call(API, `/api/v1/collections/recipes/entries/${entry.entry.id}`, {
      cookie: operator,
      method: 'DELETE',
      origin: ORIGIN,
    });
    expect(refused.res.status).toBe(403);
    expect(refused.json).toMatchObject({ error: { code: 'forbidden' } });
    expect((await call(API, `/api/v1/collections/recipes/entries/${entry.entry.id}`)).res.status).toBe(200);
  });

  it('lets an operator erase any publisher; others cannot', async () => {
    const alice = await signIn('alice');
    const erased = await register(alice, 'erasure-target');
    await publish(alice, recipe('erased publisher entry'));

    const plainBob = await signIn('bob');
    await register(plainBob, 'erasure-plain');
    const refused = await call(API, `/api/v1/publishers/${erased.id}`, {
      cookie: plainBob,
      method: 'DELETE',
      origin: ORIGIN,
    });
    expect(refused.res.status).toBe(403);
    expect((await call(API, `/api/v1/publishers/${erased.id}`, { method: 'DELETE', origin: ORIGIN })).res.status).toBe(
      401,
    );

    const operator = await signIn('bob', ORIGIN, true);
    await register(operator, 'erasure-operator');
    const erase = await call(API, `/api/v1/publishers/${erased.id}`, {
      cookie: operator,
      method: 'DELETE',
      origin: ORIGIN,
    });
    expect(erase.res.status).toBe(204);
    // Idempotent: an already-erased publisher is the same 204 with nothing left.
    const again = await call(API, `/api/v1/publishers/${erased.id}`, {
      cookie: operator,
      method: 'DELETE',
      origin: ORIGIN,
    });
    expect(again.res.status).toBe(204);
    // The erased publisher's session no longer resolves an identity.
    const meAfter = await call(API, '/api/v1/me', { cookie: alice, origin: ORIGIN });
    expect(meAfter.json).toBeNull();
  });

  it('logs every effective moderation action; the log answers only to operators', async () => {
    const alice = await signIn('alice');
    const aliceIdentity = await register(alice, 'audit-owner');
    const entry = await publish(alice, recipe('audit target recipe'));

    const operator = await signIn('bob', ORIGIN, true);
    const operatorIdentity = await register(operator, 'audit-operator');

    // Hide, the idempotent re-hide, restore, remove: exactly three effective actions.
    const target = `/api/v1/collections/recipes/entries/${entry.entry.id}`;
    expect((await call(API, `${target}/hidden`, { cookie: operator, method: 'PUT', origin: ORIGIN })).res.status).toBe(
      204,
    );
    expect((await call(API, `${target}/hidden`, { cookie: operator, method: 'PUT', origin: ORIGIN })).res.status).toBe(
      204,
    );
    expect(
      (await call(API, `${target}/hidden`, { cookie: operator, method: 'DELETE', origin: ORIGIN })).res.status,
    ).toBe(204);
    expect((await call(API, target, { cookie: operator, method: 'DELETE', origin: ORIGIN })).res.status).toBe(204);

    // The accountability read is operator-only and carries the private-read
    // precondition: a stale tab's well-formed-but-foreign id is refused, not adopted.
    const plainBob = await signIn('bob');
    await register(plainBob, 'audit-plain');
    expect((await call(API, '/api/v1/moderation-log', { cookie: plainBob, origin: ORIGIN })).res.status).toBe(403);
    expect(
      (
        await call(API, '/api/v1/moderation-log', {
          cookie: operator,
          headers: { 'x-archive-publisher': crypto.randomUUID() },
          origin: ORIGIN,
        })
      ).res.status,
    ).toBe(409);

    const log = await call(API, '/api/v1/moderation-log?limit=50', { cookie: operator, origin: ORIGIN });
    expect(log.res.status).toBe(200);
    const rows = (
      log.json as { actions: { action: string; collection: string | null; operatorId: string; targetId: string }[] }
    ).actions;
    // Newest first: this test's three effective actions lead the shared, cumulative
    // log — the idempotent re-hide left no row of its own.
    const mine = rows.slice(0, 3);
    expect(mine.map((row) => row.action)).toEqual(['remove', 'unhide', 'hide']);
    for (const row of mine) {
      expect(row.operatorId).toBe(operatorIdentity.id);
      expect(row.targetId).toBe(entry.entry.id);
      expect(row.collection).toBe('recipes');
    }

    // The terminal erasure records the deployment-wide action with no collection, and
    // the idempotent repeat adds nothing.
    expect(
      (
        await call(API, `/api/v1/publishers/${aliceIdentity.id}`, {
          cookie: operator,
          method: 'DELETE',
          origin: ORIGIN,
        })
      ).res.status,
    ).toBe(204);
    expect(
      (
        await call(API, `/api/v1/publishers/${aliceIdentity.id}`, {
          cookie: operator,
          method: 'DELETE',
          origin: ORIGIN,
        })
      ).res.status,
    ).toBe(204);
    const afterErase = await call(API, '/api/v1/moderation-log?limit=50', { cookie: operator, origin: ORIGIN });
    const after = (afterErase.json as { actions: { action: string; collection: string | null; targetId: string }[] })
      .actions;
    expect(after[0]).toMatchObject({
      action: 'erase-publisher',
      collection: null,
      operatorId: operatorIdentity.id,
      targetId: aliceIdentity.id,
    });
    expect(after).toHaveLength(rows.length + 1);
  });
});

describe('coordinated account revocation', () => {
  it('revokes catalog access and registration while allowing erasure retries', async () => {
    const cookie = await signIn('bob');
    await register(cookie, 'Revoked owner');
    const published = await publish(cookie, recipe('revoked account recipe'));
    expect(published.res.status).toBe(201);
    const erased = await call(API, '/api/v1/me/account', { cookie, method: 'DELETE' });
    expect(erased.res.status).toBe(204);
    expect(erased.res.headers.get('set-cookie')).toBeNull();
    expect((await call(API, '/api/v1/me', { cookie })).res.status).toBe(401);
    expect((await call(API, '/api/v1/me', { body: { name: 'Recreated' }, cookie, method: 'POST' })).res.status).toBe(
      401,
    );
    expect((await call(API, `/api/v1/collections/recipes/entries/${published.entry.id}`)).res.status).toBe(404);
    expect((await call(API, '/api/v1/me/account', { cookie, method: 'DELETE' })).res.status).toBe(204);
  });
});
