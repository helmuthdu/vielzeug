import { type ChildProcess, spawn } from 'node:child_process';
import { chmodSync, createWriteStream, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer as createHttpServer, type Server } from 'node:http';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { decodeJwt, exportJWK, generateKeyPair } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ACCOUNT_HEADER, AUTH_SCHEMA_VERSION, archiveAuthHealthSchema } from '../../src/contract';

/**
 * Production-shaped issuer smoke over real workerd: the package's actual
 * `createAuthWorker` on its canonical auth migration, the catalog Worker on its
 * canonical migration, and the `AUTH_ARCHIVE` service binding between them — both
 * Workers in one multi-config `wrangler dev`, served from one public origin by the
 * test-only gateway (`auth-gateway.ts`). Sign-in emails are captured by a loopback
 * sink in this process; the only artifacts holding credentials are the ephemeral
 * run dir's generated configs.
 *
 * Isolation from the catalog suite: its own port range, run dir and child set, and
 * it never stops a process it did not spawn.
 */
const PKG = resolve(__dirname, '../..');
const RUNTIME = resolve(PKG, 'node_modules/.cache/archive-integration/auth-smoke');
const WRANGLER = resolve(PKG, 'node_modules/wrangler/bin/wrangler.js');
const AUDIENCE = 'community-archive';
const EMAIL = 'smoke.reader@example.test';
const SENDER = 'no-reply@example.test';

const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' };
const children: ChildProcess[] = [];
let runDir = '';
let persistDir = '';
let gatewayConfigPath = '';
let GATEWAY = '';
let mailSink: Server | undefined;

interface CapturedMail {
  from: string;
  html?: string;
  subject: string;
  text: string;
  to: string;
}
const outbox: CapturedMail[] = [];

const bindProbe = (port: number): Promise<boolean> =>
  new Promise((resolveProbe) => {
    const probe = createServer();
    probe.once('error', () => {
      probe.close();
      resolveProbe(false);
    });
    probe.once('listening', () => probe.close(() => resolveProbe(true)));
    probe.listen(port, '127.0.0.1');
  });

/** A range disjoint from the catalog suite's scan, so concurrent files never probe the same ports. */
async function allocatePorts(count: number, from = 19620): Promise<number[]> {
  const ports: number[] = [];
  for (let port = from; ports.length < count && port < from + 300; port++) {
    if (await bindProbe(port)) ports.push(port);
  }
  if (ports.length < count) throw new Error(`could not allocate ${count} free smoke ports from ${from}`);
  return ports;
}

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

async function stopChild(child: ChildProcess): Promise<void> {
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

async function waitReady(attempts = 400): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      const [health, jwks] = await Promise.all([
        fetch(`${GATEWAY}/api/v1/health`),
        fetch(`${GATEWAY}/api/v1/auth/health`),
      ]);
      if (health.ok && jwks.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`smoke gateway at ${GATEWAY} never became ready`);
}

/** The loopback capture endpoint the gateway's AUTH_EMAIL sender posts to. */
const startMailSink = (port: number): Promise<Server> =>
  new Promise((resolveSink, reject) => {
    const server = createHttpServer((req, res) => {
      if (req.method !== 'POST' || req.url !== '/mail') {
        res.writeHead(404).end();
        return;
      }
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        try {
          outbox.push(JSON.parse(Buffer.concat(chunks).toString('utf8')) as CapturedMail);
          res.writeHead(204).end();
        } catch {
          res.writeHead(400).end();
        }
      });
    });
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolveSink(server));
  });

const writeConfig = (file: string, config: Record<string, unknown>): string => {
  const path = join(runDir, file);
  writeFileSync(path, JSON.stringify(config, null, 2), { mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
};

beforeAll(async () => {
  mkdirSync(RUNTIME, { recursive: true });
  runDir = mkdtempSync(join(RUNTIME, 'run-'));
  const persist = join(runDir, 'state');
  persistDir = persist;
  mkdirSync(persist, { recursive: true });

  const [gatewayPort, sinkPort, inspectorPort] = await allocatePorts(3);
  GATEWAY = `http://127.0.0.1:${gatewayPort}`;
  mailSink = await startMailSink(sinkPort);

  // An ephemeral 2048-bit signing key, alive only in this run's generated config.
  const { privateKey } = await generateKeyPair('RS256', { extractable: true, modulusLength: 2048 });
  const privateJwk = await exportJWK(privateKey);

  const catalogConfig = writeConfig('wrangler-catalog.jsonc', {
    compatibility_date: '2026-10-01',
    d1_databases: [
      {
        binding: 'DB',
        database_id: '00000000-0000-0000-0000-000000000020',
        database_name: 'archive-smoke-catalog',
        migrations_dir: join(PKG, 'migrations'),
        remote: false,
      },
    ],
    main: join(PKG, 'test/integration/worker.ts'),
    name: 'archive-smoke-catalog',
    ratelimits: [
      { name: 'READ_LIMIT', namespace_id: '9201', simple: { limit: 500, period: 60 } },
      { name: 'WRITE_LIMIT', namespace_id: '9202', simple: { limit: 500, period: 60 } },
    ],
    services: [{ binding: 'AUTH_ISSUER_SERVICE', service: 'archive-smoke-gateway' }],
    vars: {
      ALLOWED_ORIGINS: GATEWAY,
      APP_ENV: 'local',
      JWT_AUDIENCE: AUDIENCE,
      JWT_ISSUER: GATEWAY,
      JWT_JWKS_URL: `${GATEWAY}/api/v1/auth/jwks.json`,
      LIKES_ENABLED: 'true',
      PUBLISHING_ENABLED: 'true',
      RATE_LIMIT_KEY_SECRET: 'dev-only-insecure-pepper',
    },
    workers_dev: false,
  });
  const gatewayConfig = writeConfig('wrangler-gateway.jsonc', {
    compatibility_date: '2026-10-01',
    d1_databases: [
      {
        binding: 'AUTH_DB',
        database_id: '00000000-0000-0000-0000-000000000021',
        database_name: 'archive-smoke-auth',
        migrations_dir: join(PKG, 'migrations/auth'),
        remote: false,
      },
    ],
    dev: { ip: '127.0.0.1', port: gatewayPort },
    main: join(PKG, 'test/integration/auth-gateway.ts'),
    name: 'archive-smoke-gateway',
    services: [{ binding: 'AUTH_ARCHIVE', service: 'archive-smoke-catalog' }],
    vars: {
      ALLOWED_ORIGINS: GATEWAY,
      APP_ENV: 'local',
      APP_NAME: 'Archive Smoke',
      AUDIENCE,
      AUTH_ISSUER: GATEWAY,
      AUTH_JWT_PRIVATE_JWK: JSON.stringify(privateJwk),
      OPERATOR_EMAILS: '',
      PUBLIC_ORIGIN: GATEWAY,
      SENDER_ADDRESS: SENDER,
      SMOKE_MAIL_SINK: `http://127.0.0.1:${sinkPort}/mail`,
    },
    workers_dev: false,
  });
  gatewayConfigPath = gatewayConfig;

  for (const [config, db] of [
    [catalogConfig, 'archive-smoke-catalog'],
    [gatewayConfig, 'archive-smoke-auth'],
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
      persist,
    ]);
    if (migrate.code !== 0) throw new Error(`smoke migration failed for ${db}:\n${migrate.out}`);
  }

  const log = createWriteStream(join(runDir, 'workers.log'), { flags: 'a' });
  // The gateway config comes first: it is the primary Worker wrangler serves on the port.
  const child = spawn(
    process.execPath,
    [
      WRANGLER,
      'dev',
      '--config',
      gatewayConfig,
      '--config',
      catalogConfig,
      '--port',
      String(gatewayPort),
      '--inspector-port',
      String(inspectorPort),
      '--persist-to',
      persist,
    ],
    { cwd: PKG, detached: true, env, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  child.stdout?.pipe(log);
  child.stderr?.pipe(log);
  children.push(child);
  await waitReady();
}, 240_000);

afterAll(async () => {
  for (const child of [...children].reverse()) await stopChild(child);
  await new Promise<void>((done) => (mailSink === undefined ? done() : mailSink.close(() => done())));
});

interface CallOptions {
  body?: unknown;
  cookie?: string;
  headers?: Record<string, string>;
  marker?: boolean;
  method?: string;
  origin?: string | null;
}

async function call(path: string, opts: CallOptions = {}) {
  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.origin !== null) headers.origin = opts.origin ?? GATEWAY;
  if (opts.cookie !== undefined) headers.cookie = opts.cookie;
  if (opts.marker ?? (method !== 'GET' && method !== 'HEAD')) headers['x-archive-request'] = '1';
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(`${GATEWAY}${path}`, {
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    headers,
    method,
    redirect: 'manual',
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    /* html or empty */
  }
  return { json, res, text };
}

/** Requests a link and returns the token the captured email carries. */
async function requestLink(email: string, to = EMAIL): Promise<string> {
  const before = outbox.length;
  const { res, json } = await call('/api/v1/auth/sign-in', { body: { email }, method: 'POST' });
  expect(res.status).toBe(202);
  expect(json).toEqual({ ok: true });
  expect(res.headers.get('set-cookie')).toBeNull();
  expect(outbox).toHaveLength(before + 1);
  const mail = outbox[before];
  expect(mail).toMatchObject({ from: SENDER, subject: 'Your Archive Smoke sign-in link', to });
  const prefix = `${GATEWAY}/api/v1/auth/verify?token=`;
  const match = mail.text.match(/(\S+\/api\/v1\/auth\/verify\?token=([A-Za-z0-9_-]{43}))(?:\s|$)/);
  expect(match?.[1].startsWith(prefix)).toBe(true);
  return match?.[2] ?? '';
}

/**
 * Reads the issuer's local D1 directly through wrangler, beside the running Worker:
 * evidence of stored state the HTTP surface deliberately never exposes.
 */
async function authRows<T>(sql: string): Promise<T[]> {
  const out = await wrangler([
    'd1',
    'execute',
    'archive-smoke-auth',
    '--local',
    '--config',
    gatewayConfigPath,
    '--persist-to',
    persistDir,
    '--json',
    '--command',
    sql,
  ]);
  if (out.code !== 0) throw new Error(`auth D1 read failed:\n${out.out}`);
  const start = out.out.indexOf('[');
  return (JSON.parse(out.out.slice(start)) as { results: T[] }[])[0]?.results ?? [];
}

/** The browser's deliberate confirmation: the guarded POST that redeems the link once. */
const confirm = (token: string, opts: Omit<CallOptions, 'body' | 'method'> = {}) =>
  call('/api/v1/auth/verify', { ...opts, body: { token }, method: 'POST' });

const sessionCookie = (res: Response): string => {
  const header = res.headers.get('set-cookie') ?? '';
  expect(header).toMatch(/^archive_session=[^;]+; HttpOnly; SameSite=Strict; Path=\/api\/v1; Max-Age=\d+$/);
  return header.split(';', 1)[0];
};

describe('production issuer smoke (real workerd, bidirectional service bindings)', () => {
  let pendingToken = '';
  const first: { cookie: string; publisher: string; subject: string; entry: string } = {
    cookie: '',
    entry: '',
    publisher: '',
    subject: '',
  };

  it('serves issuer readiness without a session and validates the canonical auth schema', async () => {
    const { res, json } = await call('/api/v1/auth/health', { origin: null });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(archiveAuthHealthSchema.parse(json)).toEqual({
      dbSchemaVersion: AUTH_SCHEMA_VERSION,
      reason: null,
      schemaVersion: 1,
      status: 'ok',
    });
    expect(outbox).toHaveLength(0);
  });

  it('requests a link with a canonicalized email and captures exactly one message', async () => {
    const before = outbox.length;
    const { res } = await call('/api/v1/auth/sign-in', {
      body: { email: '  Smoke.Reader@Example.TEST ' },
      method: 'POST',
      origin: 'https://evil.example',
    });
    expect(res.status).toBe(403);
    expect(outbox).toHaveLength(before);
    // The canonical address is what the mail goes to.
    const token = await requestLink('  Smoke.Reader@Example.TEST ');
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    pendingToken = token;
  });

  it('serves GET verify as a no-store confirmation page that never consumes the link', async () => {
    const token = pendingToken;
    for (let i = 0; i < 2; i++) {
      const { res, text } = await call(`/api/v1/auth/verify?token=${token}`, { origin: null });
      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control')).toBe('no-store');
      expect(res.headers.get('content-type')).toMatch(/^text\/html/);
      expect(res.headers.get('content-security-policy')).toMatch(/default-src 'none'; script-src 'nonce-/);
      expect(res.headers.get('referrer-policy')).toBe('no-referrer');
      expect(res.headers.get('set-cookie')).toBeNull();
      expect(text).toContain('Confirm sign-in');
      const nonce = /<style nonce="([^"]+)">/.exec(text)?.[1];
      expect(nonce).toBeTruthy();
      expect(res.headers.get('content-security-policy')).toContain(`style-src 'nonce-${nonce}'`);
      expect(res.headers.get('content-security-policy')).not.toContain('unsafe-inline');
      expect(text).toContain('<main id="main" aria-labelledby="title">');
      expect(text).toContain('Sign in to Archive Smoke');
      expect(text).toContain(`href="${GATEWAY}/"`);
      expect(text).toContain(`id="recovery" href="${GATEWAY}/account" hidden>Request a new sign-in link</a>`);
      expect(text).toContain('<noscript>');
      expect(text).toMatch(new RegExp(`<noscript>[\\s\\S]*href="${GATEWAY}/account"`));
      expect(text.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')).not.toContain(token);
    }
  });

  it('returns branded invalid-link HTML for GET while malformed POST remains a JSON error', async () => {
    const invalid = await call('/api/v1/auth/verify?token=short&next=https://evil.example', { origin: null });
    expect(invalid.res.status).toBe(400);
    expect(invalid.res.headers.get('content-type')).toMatch(/^text\/html/);
    expect(invalid.res.headers.get('cache-control')).toBe('no-store');
    expect(invalid.res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(invalid.res.headers.get('set-cookie')).toBeNull();
    expect(invalid.text).toContain('This sign-in link is not valid');
    expect(invalid.text).toContain('Archive Smoke');
    expect(invalid.text).toContain(
      `class="primary" id="recovery" href="${GATEWAY}/account">Request a new sign-in link</a>`,
    );
    expect(invalid.text).not.toMatch(/evil.example|id="confirm"|fetch\(/);
    const post = await confirm('short');
    expect(post.res.status).toBe(400);
    expect(post.res.headers.get('content-type')).toMatch(/^application\/json/);
    expect(post.json).toMatchObject({ error: { code: 'bad-request' } });
    expect(post.res.headers.get('set-cookie')).toBeNull();
  });

  it('redeems only through the guarded POST, setting the session exactly once', async () => {
    const token = pendingToken;
    // Missing marker, foreign origin and query-carried tokens are refused without consuming.
    expect((await confirm(token, { marker: false })).res.status).toBe(403);
    expect((await confirm(token, { origin: 'https://evil.example' })).res.status).toBe(403);
    expect((await confirm(token, { origin: null })).res.status).toBe(403);
    const queried = await call(`/api/v1/auth/verify?token=${token}`, { body: { token }, method: 'POST' });
    expect(queried.res.status).toBe(400);

    const redeemed = await confirm(token);
    expect(redeemed.res.status).toBe(204);
    expect(redeemed.res.headers.get('cache-control')).toBe('no-store');
    first.cookie = sessionCookie(redeemed.res);
    expect(redeemed.res.headers.get('set-cookie')).not.toContain('Secure');

    const replay = await confirm(token);
    expect(replay.res.status).toBe(410);
    expect(replay.json).toMatchObject({ error: { code: 'gone' } });
    expect(replay.res.headers.get('set-cookie')).toBeNull();
    // A consumed link still renders its harmless page.
    expect((await call(`/api/v1/auth/verify?token=${token}`, { origin: null })).res.status).toBe(200);
  });

  it('registers the catalog profile and publishes through the verified session', async () => {
    const anonymousMe = await call('/api/v1/me', { cookie: first.cookie });
    expect(anonymousMe.res.status).toBe(200);
    expect(anonymousMe.json).toBeNull();

    const registered = await call('/api/v1/me', {
      body: { name: 'Smoke Reader' },
      cookie: first.cookie,
      method: 'POST',
    });
    expect(registered.res.status).toBe(201);
    const identity = registered.json as { id: string; name: string; operator: boolean };
    expect(identity).toMatchObject({ name: 'Smoke Reader', operator: false });
    first.publisher = identity.id;

    const published = await call('/api/v1/collections/recipes/entries', {
      body: {
        clientKey: crypto.randomUUID(),
        payload: { cuisine: 'italian', ingredients: ['tomato', 'basil'], name: 'smoke recipe' },
      },
      cookie: first.cookie,
      headers: { 'x-archive-publisher': first.publisher },
      method: 'POST',
    });
    expect(published.res.status).toBe(201);
    first.entry = (published.json as { id: string }).id;
    const detail = await call(`/api/v1/collections/recipes/entries/${first.entry}`, { origin: null });
    expect(detail.res.status).toBe(200);
  });

  it('exports the issuer account record without credentials', async () => {
    expect((await call('/api/v1/auth/account')).res.status).toBe(401);
    const { res, json, text } = await call('/api/v1/auth/account', { cookie: first.cookie });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const account = json as { createdAt: string; email: string; id: string; lastSignInAt: string | null };
    expect(Object.keys(account).sort()).toEqual(['createdAt', 'email', 'id', 'lastSignInAt']);
    expect(account.email).toBe(EMAIL);
    expect(account.lastSignInAt).not.toBeNull();
    expect(text).not.toMatch(/token|budget|window/i);
    first.subject = account.id;
  });

  it('rejects stale account confirmation after switching to an email-only session', async () => {
    const token = await requestLink('email-only@example.test', 'email-only@example.test');
    const signedIn = await confirm(token);
    expect(signedIn.res.status).toBe(204);
    const cookie = sessionCookie(signedIn.res);
    const exported = await call('/api/v1/auth/account', { cookie });
    const account = exported.json as { id: string };
    expect((await call('/api/v1/me', { cookie })).json).toBeNull();
    const rejected = await call('/api/v1/auth/account', {
      cookie,
      headers: { [ACCOUNT_HEADER]: first.subject },
      method: 'DELETE',
    });
    expect(rejected.res.status).toBe(409);
    expect(rejected.json).toMatchObject({ error: { code: 'account-changed' } });
    expect(rejected.res.headers.get('set-cookie')).toBeNull();
    expect((await call('/api/v1/auth/account', { cookie })).res.status).toBe(200);
    expect((await call('/api/v1/auth/account', { cookie: first.cookie })).res.status).toBe(200);
    const erased = await call('/api/v1/auth/account', {
      cookie,
      headers: { [ACCOUNT_HEADER]: account.id },
      method: 'DELETE',
    });
    expect(erased.res.status).toBe(204);
  });

  it('fully erases through AUTH_ARCHIVE and rejects authority after the issuer account is gone', async () => {
    const unguarded = await call('/api/v1/auth/account', { cookie: first.cookie, marker: false, method: 'DELETE' });
    expect(unguarded.res.status).toBe(403);

    const erased = await call('/api/v1/auth/account', {
      cookie: first.cookie,
      headers: { [ACCOUNT_HEADER]: first.subject, 'x-archive-publisher': first.publisher },
      method: 'DELETE',
    });
    expect(erased.res.status).toBe(204);
    expect(erased.res.headers.get('set-cookie')).toMatch(/^archive_session=; .*Max-Age=0$/);

    // The catalog revoked the subject: the still-signed old cookie is refused everywhere ordinary.
    expect((await call('/api/v1/me', { cookie: first.cookie })).res.status).toBe(401);
    const reRegister = await call('/api/v1/me', { body: { name: 'Again' }, cookie: first.cookie, method: 'POST' });
    expect(reRegister.res.status).toBe(401);
    // The issuer row is gone, and the profile's content cascaded with it.
    expect((await call('/api/v1/auth/account', { cookie: first.cookie })).res.status).toBe(401);
    expect((await call(`/api/v1/collections/recipes/entries/${first.entry}`, { origin: null })).res.status).toBe(404);

    // Completed erasure has no issuer account left to authorize a retry.
    const retry = await call('/api/v1/auth/account', {
      cookie: first.cookie,
      headers: { [ACCOUNT_HEADER]: first.subject },
      method: 'DELETE',
    });
    expect(retry.res.status).toBe(401);
  });

  it('re-enrolls the same email as a fresh issuer subject and catalog publisher', async () => {
    const token = await requestLink(EMAIL);
    const redeemed = await confirm(token);
    expect(redeemed.res.status).toBe(204);
    const cookie = sessionCookie(redeemed.res);
    expect(cookie).not.toBe(first.cookie);

    const account = await call('/api/v1/auth/account', { cookie });
    expect(account.res.status).toBe(200);
    const fresh = account.json as { email: string; id: string };
    expect(fresh.email).toBe(EMAIL);
    expect(fresh.id).not.toBe(first.subject);

    expect((await call('/api/v1/me', { cookie })).json).toBeNull();
    const registered = await call('/api/v1/me', { body: { name: 'Smoke Reader' }, cookie, method: 'POST' });
    expect(registered.res.status).toBe(201);
    expect((registered.json as { id: string }).id).not.toBe(first.publisher);
  });

  it('redeems one link at most once under concurrent POSTs, through the D1 trigger', async () => {
    const email = 'smoke.race@example.test';
    const token = await requestLink(email, email);
    const userSql = `SELECT u.last_sign_in_at AS stamped, (SELECT count(*) FROM auth_tokens t WHERE t.user_id = u.id) AS tokens FROM auth_users u WHERE u.email = '${email}'`;
    // The confirmation page is free: the stored link survives any number of GETs.
    expect((await call(`/api/v1/auth/verify?token=${token}`, { origin: null })).res.status).toBe(200);
    expect(await authRows<{ stamped: string | null; tokens: number }>(userSql)).toEqual([{ stamped: null, tokens: 1 }]);

    const attempts = await Promise.all(Array.from({ length: 6 }, () => confirm(token)));
    const statuses = attempts.map(({ res }) => res.status).sort();
    expect(statuses).toEqual([204, 410, 410, 410, 410, 410]);
    const cookies = attempts.map(({ res }) => res.headers.get('set-cookie')).filter((value) => value !== null);
    expect(cookies).toHaveLength(1);

    // The trigger stamped the account and removed the credential in the redeeming statement.
    const [after] = await authRows<{ stamped: string | null; tokens: number }>(userSql);
    expect(after.tokens).toBe(0);
    expect(after.stamped).not.toBeNull();
    expect(await authRows('SELECT 1 FROM auth_tokens WHERE redeemed_at IS NOT NULL')).toEqual([]);
    expect((await confirm(token)).res.status).toBe(410);
  });

  it('revokes two real sessions through the service cycle while preserving content and accepting fresh login', async () => {
    const email = 'smoke.revoke@example.test';
    const first = sessionCookie((await confirm(await requestLink(email, email))).res);
    const second = sessionCookie((await confirm(await requestLink(email, email))).res);
    expect(first).not.toBe(second);
    const account = decodeJwt(first.split('=')[1]).sub ?? '';
    expect(decodeJwt(first.split('=')[1]).sessionVersion).toBe(0);
    const registered = await call('/api/v1/me', { body: { name: 'Revocation Reader' }, cookie: first, method: 'POST' });
    expect(registered.res.status).toBe(201);
    const publisher = (registered.json as { id: string }).id;
    const published = await call('/api/v1/collections/recipes/entries', {
      body: {
        clientKey: crypto.randomUUID(),
        payload: { cuisine: 'italian', ingredients: ['basil'], name: 'retained recipe' },
      },
      cookie: first,
      headers: { 'x-archive-publisher': publisher },
      method: 'POST',
    });
    expect(published.res.status).toBe(201);
    const entry = (published.json as { id: string }).id;
    const responses = await Promise.all(
      [first, second].map((cookie) =>
        call('/api/v1/auth/sign-out-all', {
          cookie,
          headers: { [ACCOUNT_HEADER]: account },
          method: 'POST',
        }),
      ),
    );
    expect(responses.map(({ res }) => res.status).sort()).toEqual([200, 401]);
    expect(responses.find(({ res }) => res.status === 200)?.res.headers.get('set-cookie')).toContain('Max-Age=0');
    for (const cookie of [first, second]) {
      expect((await call('/api/v1/me', { cookie })).res.status).toBe(401);
      expect((await call('/api/v1/auth/session', { cookie })).res.status).toBe(401);
    }
    expect((await call(`/api/v1/collections/recipes/entries/${entry}`)).res.status).toBe(200);
    const fresh = sessionCookie((await confirm(await requestLink(email, email))).res);
    expect(decodeJwt(fresh.split('=')[1]).sessionVersion).toBe(1);
    expect((await call('/api/v1/me', { cookie: fresh })).json).toMatchObject({
      id: publisher,
      name: 'Revocation Reader',
    });
    expect((await call('/api/v1/auth/session', { cookie: fresh })).json).toEqual({ ok: true });
  });

  it('deletes an outstanding magic link in the same D1 revocation and never mints it later', async () => {
    const email = 'smoke.links@example.test';
    const cookie = sessionCookie((await confirm(await requestLink(email, email))).res);
    const outstanding = await requestLink(email, email);
    const account = decodeJwt(cookie.split('=')[1]).sub ?? '';
    const revoked = await call('/api/v1/auth/sign-out-all', {
      cookie,
      headers: { [ACCOUNT_HEADER]: account },
      method: 'POST',
    });
    expect(revoked.res.status).toBe(200);
    expect(await authRows(`SELECT session_version FROM auth_users WHERE id = '${account}'`)).toEqual([
      { session_version: 1 },
    ]);
    expect(await authRows(`SELECT token_hash FROM auth_tokens WHERE user_id = '${account}'`)).toEqual([]);
    expect((await confirm(outstanding)).res.status).toBe(410);
  });

  it('finishes partial erasure without recursive validation but does not resurrect the tombstoned profile', async () => {
    const email = 'smoke.partial@example.test';
    const cookie = sessionCookie((await confirm(await requestLink(email, email))).res);
    const account = decodeJwt(cookie.split('=')[1]).sub ?? '';
    const registered = await call('/api/v1/me', { body: {}, cookie, method: 'POST' });
    expect(registered.res.status).toBe(201);
    const publisher = (registered.json as { id: string }).id;
    const erase = () =>
      call('/api/v1/auth/account', {
        cookie,
        headers: { [ACCOUNT_HEADER]: account, 'x-archive-publisher': publisher },
        method: 'DELETE',
      });
    await authRows(`CREATE TRIGGER smoke_delete_failure BEFORE DELETE ON auth_users
      WHEN OLD.id = '${account}' BEGIN SELECT RAISE(ABORT, 'fixture failure'); END`);
    const failed = await erase();
    expect(failed.res.status).toBe(500);
    expect(failed.res.headers.get('set-cookie')).toBeNull();
    expect((await call('/api/v1/me', { body: {}, cookie, method: 'POST' })).res.status).toBe(401);
    expect((await call('/api/v1/auth/session', { cookie })).res.status).toBe(200);
    await authRows('DROP TRIGGER smoke_delete_failure');
    expect((await erase()).res.status).toBe(204);
    expect((await call('/api/v1/auth/session', { cookie })).res.status).toBe(401);
    expect((await call('/api/v1/me', { body: {}, cookie, method: 'POST' })).res.status).toBe(401);
  });
});
