import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { exportJWK, generateKeyPair, jwtVerify, SignJWT } from 'jose';
// Shared session-cookie contract with the Worker — the test imports the source.
import {
  ARCHIVE_OPERATOR_ROLE,
  OPERATOR_SESSION_MAX_AGE_SECONDS,
  REQUEST_MARKER_HEADER,
  sessionCookieValue,
} from '../../src/contract';

/**
 * The development-only token issuer for the integration suite: an ephemeral
 * in-memory RSA key, a JWKS endpoint and a two-user sign-in that sets the
 * archive_session cookie the Worker verifies. An `operator` flag in the sign-in
 * body mints the session token with the operator role claim the moderation routes
 * check. It binds loopback only, refuses to start in a production environment,
 * and is never bundled into the Worker. The private signing key stays inside this
 * closure; nothing here exposes it.
 */
export interface IssuerOptions {
  allowedOrigins: readonly string[];
  audience: string;
  host: string;
  issuer: string;
  port: number;
}

export interface IssuerHandle {
  readonly disposalSignal: AbortSignal;
  dispose(): Promise<void>;
  readonly disposed: boolean;
  issuer: string;
  port: number;
  url: string;
  [Symbol.asyncDispose](): Promise<void>;
}

const DEV_USERS = [
  { id: 'alice', name: 'Alice', subject: 'local-alice' },
  { id: 'bob', name: 'Bob', subject: 'local-bob' },
  // A dedicated operator subject: tests that need an UNREGISTERED operator sign
  // in here, so no other test's registration can satisfy the row requirement.
  { id: 'op', name: 'Op', subject: 'local-op' },
] as const;

/** The test issuer's own ephemeral cadence: short-lived tokens for fast test loops. */
const TOKEN_TTL_SECONDS = 900;
const MAX_BODY = 4096;
const BODY_DEADLINE_MS = 5000;

const json = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
};

const fail = (res: ServerResponse, status: number, code: string, message: string): void => {
  json(res, status, { error: { code, message, requestId: crypto.randomUUID() } }, { 'cache-control': 'no-store' });
};

/** Loopback Host headers only: plain names, IPv4 and bracketed IPv6 with ports. */
const isLoopbackHost = (host: string | undefined): boolean => {
  if (host === undefined || host.length === 0) return false;
  try {
    const { hostname } = new URL(`http://${host}`);
    return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]';
  } catch {
    return false;
  }
};

/** Bounded body read with a wall-clock deadline, like the Worker's own reader. */
const readBody = (req: IncomingMessage): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('timeout'));
      req.destroy();
    }, BODY_DEADLINE_MS);
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.byteLength;
      if (total > MAX_BODY) {
        clearTimeout(timer);
        reject(new Error('too-large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('bad-json'));
      }
    });
    req.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

export async function startIssuer(options: IssuerOptions): Promise<IssuerHandle> {
  if ((process.env.APP_ENV as string | undefined) === 'production') {
    throw new Error('The development issuer must not run in production.');
  }
  if (!isLoopbackHost(options.host)) {
    throw new Error(`The development issuer binds loopback only, not "${options.host}".`);
  }

  const { privateKey, publicKey } = await generateKeyPair('RS256');
  // A unique kid per ephemeral key: nothing stable to correlate across runs.
  const kid = crypto.randomUUID();
  const jwk = { ...(await exportJWK(publicKey)), kid };

  const signToken = (subject: string, operator: boolean): Promise<string> =>
    new SignJWT({ sessionVersion: 0, ...(operator ? { roles: [ARCHIVE_OPERATOR_ROLE] } : {}) })
      .setProtectedHeader({ alg: 'RS256', kid })
      .setIssuer(options.issuer)
      .setAudience(options.audience)
      .setSubject(subject)
      .setIssuedAt()
      // Every sign-in mints a distinct token, like a real issuer: two sign-ins in
      // the same second must never share one cookie value.
      .setJti(crypto.randomUUID())
      .setExpirationTime(`${operator ? OPERATOR_SESSION_MAX_AGE_SECONDS : TOKEN_TTL_SECONDS}s`)
      .sign(privateKey);

  const allowedOrigins = new Set(options.allowedOrigins);

  /** Unsafe issuer routes require an exact allowed Origin plus the request marker. */
  const guardUnsafe = (req: IncomingMessage, res: ServerResponse): boolean => {
    if (!isLoopbackHost(req.headers.host)) {
      fail(res, 403, 'forbidden', 'That action is not allowed.');
      return false;
    }
    const origin = req.headers.origin;
    if (origin === undefined || !allowedOrigins.has(origin)) {
      fail(res, 403, 'forbidden', 'That action is not allowed.');
      return false;
    }
    if (req.headers[REQUEST_MARKER_HEADER] !== '1') {
      fail(res, 403, 'forbidden', 'That action is not allowed.');
      return false;
    }
    return true;
  };

  const server: Server = createServer((req, res) => {
    void (async () => {
      try {
        // URL construction lives inside the error path: a malformed Host is a 400.
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'bad'}`);
        if (req.method === 'GET' && url.pathname === '/.well-known/jwks.json') {
          json(res, 200, { keys: [jwk] }, { 'cache-control': 'no-store' });
          return;
        }
        if (req.method === 'GET' && url.pathname === '/api/v1/auth/session') {
          const token = /(?:^|;\s*)archive_session=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
          try {
            if (token === undefined) throw new Error('No session');
            const { payload } = await jwtVerify(token, publicKey, {
              algorithms: ['RS256'],
              audience: options.audience,
              clockTolerance: 5,
              issuer: options.issuer,
              requiredClaims: ['sub', 'iss', 'aud', 'iat', 'exp', 'sessionVersion'],
            });
            if (payload.sessionVersion !== 0) throw new Error('Invalid version');
            json(res, 200, { ok: true }, { 'cache-control': 'no-store' });
          } catch {
            fail(res, 401, 'unauthenticated', 'Sign in to continue.');
          }
          return;
        }
        if (req.method === 'GET' && url.pathname === '/dev-auth/users') {
          json(res, 200, { users: DEV_USERS.map(({ id, name }) => ({ id, name })) }, { 'cache-control': 'no-store' });
          return;
        }
        if (req.method === 'POST' && url.pathname === '/dev-auth/sign-in') {
          if (!guardUnsafe(req, res)) return;
          const mediaType = (req.headers['content-type'] ?? '').split(';', 1)[0].trim().toLowerCase();
          if (mediaType !== 'application/json') {
            fail(res, 415, 'unsupported-media', 'JSON bodies only.');
            return;
          }
          const body = await readBody(req).catch(() => null);
          const user = (body as { user?: unknown } | null)?.user;
          const operator = (body as { operator?: unknown } | null)?.operator;
          const account = DEV_USERS.find((u) => u.id === user);
          const keys = body !== null && typeof body === 'object' ? Object.keys(body) : [];
          const valid =
            account !== undefined &&
            keys.every((key) => key === 'user' || key === 'operator') &&
            (operator === undefined || typeof operator === 'boolean');
          if (typeof body !== 'object' || body === null || !valid) {
            fail(res, 400, 'bad-request', 'The request is not valid.');
            return;
          }
          const token = await signToken(account.subject, operator === true);
          const maxAgeSeconds = operator === true ? OPERATOR_SESSION_MAX_AGE_SECONDS : TOKEN_TTL_SECONDS;
          const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000).toISOString();
          json(
            res,
            200,
            { expiresAt },
            {
              'cache-control': 'no-store',
              // The issuer binds loopback HTTP only: the cookie is never Secure here.
              'set-cookie': sessionCookieValue(token, { maxAgeSeconds, secure: false }),
            },
          );
          return;
        }
        fail(res, 404, 'not-found', 'No such route.');
      } catch {
        fail(res, 500, 'internal', 'Something went wrong.');
      }
    })();
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, options.host, resolve);
  });
  const address = server.address();
  const port = typeof address === 'object' && address !== null ? address.port : options.port;

  const controller = new AbortController();
  let closed = false;
  const dispose = (): Promise<void> =>
    new Promise<void>((resolve) => {
      if (closed) return resolve();
      closed = true;
      controller.abort();
      server.close(() => resolve());
    });

  const handle: IssuerHandle = {
    [Symbol.asyncDispose]() {
      return handle.dispose();
    },
    get disposalSignal() {
      return controller.signal;
    },
    dispose,
    get disposed() {
      return closed;
    },
    issuer: options.issuer,
    port,
    url: `http://${options.host}:${port}`,
  };
  return handle;
}
