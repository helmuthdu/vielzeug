import { runInNewContext } from 'node:vm';
import { decodeJwt, decodeProtectedHeader, importJWK, SignJWT } from 'jose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AuthEvent, createAuthWorker } from '../auth';
import { consumeToken, spendSignInBudget } from '../auth/store';
import {
  ACCOUNT_HEADER,
  ARCHIVE_OPERATOR_ROLE,
  archiveAccountSchema,
  archiveErrorResponseSchema,
  OPERATOR_SESSION_MAX_AGE_SECONDS,
  SESSION_MAX_AGE_SECONDS,
} from '../contract';
import {
  APP_ORIGIN,
  cookiePair,
  type Harness,
  harness,
  lastLinkToken,
  mutation,
  rsaPrivateJwk,
  signInRequest,
  url,
  verifyRequest,
} from './auth-fixture';

const issuer = createAuthWorker();

let log: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const errorCode = async (response: Response): Promise<string> =>
  ((await response.json()) as { error: { code: string } }).error.code;

/** Requests a link and follows it; returns the verify response. */
async function signIn(h: Harness, email: string): Promise<Response> {
  const requested = await issuer.fetch(signInRequest(email), h.env);
  expect(requested.status).toBe(202);
  return issuer.fetch(verifyRequest(lastLinkToken(h.sent)), h.env);
}

const userCount = (h: Harness): number =>
  Number((h.db.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_users').get() as { n: number }).n);

describe('configuration', () => {
  it.each([
    ['an unknown APP_ENV', { APP_ENV: 'staging' }],
    ['a production env with loopback HTTP origins', { APP_ENV: 'production' }],
    ['a wildcard origin', { ALLOWED_ORIGINS: '*' }],
    ['an origin with a path', { ALLOWED_ORIGINS: `${APP_ORIGIN}/app` }],
    ['a missing catalog binding', { AUTH_ARCHIVE: undefined }],
    ['an email binding without send', { AUTH_EMAIL: {} }],
    ['a non-JSON private key', { AUTH_JWT_PRIVATE_JWK: 'not json' }],
    ['a public key where the private key belongs', { AUTH_JWT_PRIVATE_JWK: '{"kty":"RSA","n":"abc","e":"AQAB"}' }],
    ['a malformed operator roster', { OPERATOR_EMAILS: 'not-an-email' }],
  ])('answers 503 for %s without naming the field', async (_label, override) => {
    const h = await harness(override);
    const response = await issuer.fetch(new Request(url('/jwks.json')), h.env);
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).toContain('"unavailable"');
    expect(body).not.toMatch(/APP_ENV|ORIGIN|JWK|AUTH_/);
  });

  it('rejects retired keys that carry private members', async () => {
    const leaked = await rsaPrivateJwk();
    const h = await harness({ AUTH_JWT_PREVIOUS_PUBLIC_JWKS: JSON.stringify({ keys: [leaked] }) });
    expect((await issuer.fetch(new Request(url('/jwks.json')), h.env)).status).toBe(503);
  });

  it.each(['local', 'production'])('serves no development sign-in routes under APP_ENV=%s', async (appEnv) => {
    const h = await harness(
      appEnv === 'production'
        ? {
            ALLOWED_ORIGINS: 'https://app.example.test',
            APP_ENV: 'production',
            AUTH_ISSUER: 'https://auth.example.test',
            PUBLIC_ORIGIN: 'https://app.example.test',
          }
        : {},
    );
    for (const [path, method] of [
      ['/dev-accounts', 'GET'],
      ['/dev-sign-in', 'POST'],
    ] as const) {
      const response = await issuer.fetch(mutation(path, { method }), h.env);
      expect(response.status).toBe(404);
    }
  });
});

describe('error boundary', () => {
  it('turns a rejected D1 call into a sanitized 500 without implicit logging', async () => {
    const h = await harness();
    h.db.failOn('INSERT INTO auth_users');
    const response = await issuer.fetch(signInRequest('someone@example.test'), h.env);
    expect(response.status).toBe(500);
    expect(await errorCode(response)).toBe('internal');
    expect(log).not.toHaveBeenCalled();
  });

  it('answers 405 for a known route with the wrong method', async () => {
    const h = await harness();
    const response = await issuer.fetch(new Request(url('/sign-in')), h.env);
    expect(response.status).toBe(405);
  });
});

describe('POST /sign-in', () => {
  it('shares one atomic durable admission window across concurrent issuer instances', async () => {
    vi.useFakeTimers({ now: 1_000_000, toFake: ['Date'] });
    const h = await harness();
    const other = createAuthWorker();
    const responses = await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        (i % 2 === 0 ? issuer : other).fetch(signInRequest(`concurrent${i}@example.test`), h.env),
      ),
    );
    expect(responses.filter((response) => response.status === 202)).toHaveLength(20);
    expect(responses.filter((response) => response.status === 429)).toHaveLength(5);
    expect(responses.find((response) => response.status === 429)?.headers.get('retry-after')).toBe('60');
    expect(userCount(h)).toBe(20);
    expect(h.sent).toHaveLength(20);
    expect(h.db.sqlite.prepare('SELECT admitted FROM auth_sign_in_budget').get()).toEqual({ admitted: 20 });
  });

  it('reopens admission exactly at 60 seconds and rounds retry-after upwards', async () => {
    const h = await harness();
    for (let i = 0; i < 20; i++) expect(await spendSignInBudget(h.db, 1_000)).toBeNull();
    expect(await spendSignInBudget(h.db, 1_001)).toBe(60);
    expect(await spendSignInBudget(h.db, 59_999)).toBe(2);
    expect(await spendSignInBudget(h.db, 60_999)).toBe(1);
    expect(await spendSignInBudget(h.db, 61_000)).toBeNull();
    expect(h.db.sqlite.prepare('SELECT window_start, admitted FROM auth_sign_in_budget').get()).toEqual({
      admitted: 1,
      window_start: 61_000,
    });
  });

  it('does not refund global admission after database or delivery failures', async () => {
    const h = await harness({
      AUTH_EMAIL: {
        send: async () => {
          throw new Error('secret provider payload');
        },
      },
    });
    h.db.failOn('INSERT INTO auth_users');
    expect((await issuer.fetch(signInRequest('failed@example.test'), h.env)).status).toBe(500);
    expect((await issuer.fetch(signInRequest('failed@example.test'), h.env)).status).toBe(503);
    expect(h.db.sqlite.prepare('SELECT admitted FROM auth_sign_in_budget').get()).toEqual({ admitted: 2 });
  });

  it('refuses a missing origin or request marker', async () => {
    const h = await harness();
    const init = {
      body: '{"email":"a@example.test"}',
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    };
    expect((await issuer.fetch(new Request(url('/sign-in'), init), h.env)).status).toBe(403);
    const foreign = new Request(url('/sign-in'), {
      ...init,
      headers: { ...init.headers, origin: 'http://evil.example.test', 'x-archive-request': '1' },
    });
    expect((await issuer.fetch(foreign, h.env)).status).toBe(403);
  });

  it('rejects non-JSON media with 415 and oversized bodies with 413', async () => {
    const h = await harness();
    const text = mutation('/sign-in', {
      body: 'email=a@example.test',
      headers: { 'content-type': 'text/plain' },
      method: 'POST',
    });
    expect((await issuer.fetch(text, h.env)).status).toBe(415);
    const huge = mutation('/sign-in', {
      body: JSON.stringify({ email: `${'a'.repeat(200_000)}@example.test` }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    expect((await issuer.fetch(huge, h.env)).status).toBe(413);
  });

  it.each([
    ['extra members', { admin: true, email: 'a@example.test' }],
    ['a non-object body', ['a@example.test']],
  ])('rejects %s with 400', async (_label, body) => {
    const h = await harness();
    const request = mutation('/sign-in', {
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    expect((await issuer.fetch(request, h.env)).status).toBe(400);
  });

  it('creates the account row at request time and mails an escaped single-use link', async () => {
    const h = await harness();
    const response = await issuer.fetch(signInRequest('new@example.test'), h.env);
    expect(response.status).toBe(202);
    expect(userCount(h)).toBe(1);
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0].to).toBe('new@example.test');
    expect(h.sent[0].html).toContain('Test &#60;App&#62;');
    expect(h.sent[0].text).toContain(`${APP_ORIGIN}/api/v1/auth/verify?token=`);
  });

  it('normalizes requested emails before validation and stores one account for mixed-case variants', async () => {
    const h = await harness();
    for (const email of ['  Alice@Example.Test  ', 'alice@example.test', 'ALICE@EXAMPLE.TEST']) {
      expect((await issuer.fetch(signInRequest(email), h.env)).status).toBe(202);
    }
    expect(userCount(h)).toBe(1);
    expect(h.sent.map((message) => message.to)).toEqual(Array(3).fill('alice@example.test'));
  });

  it('caps varied emails globally before creating accounts or sending mail', async () => {
    const h = await harness();
    for (let i = 0; i < 22; i++) {
      const response = await issuer.fetch(signInRequest(`person${i}@example.test`), h.env);
      expect(response.status).toBe(i < 20 ? 202 : 429);
    }
    expect(userCount(h)).toBe(20);
    expect(h.sent).toHaveLength(20);
    expect(h.db.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_link_budget').get()).toEqual({ n: 20 });
  });

  it('caps sends per hour and never refunds the allowance when links are consumed', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-12T10:00:00Z'), toFake: ['Date'] });
    const h = await harness();
    for (let i = 0; i < 3; i++) await signIn(h, 'capped@example.test');
    const capped = await issuer.fetch(signInRequest('capped@example.test'), h.env);
    expect(capped.status).toBe(429);
    expect(Number(capped.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(h.sent).toHaveLength(3);

    vi.setSystemTime(new Date('2026-10-12T11:00:00Z'));
    expect((await issuer.fetch(signInRequest('capped@example.test'), h.env)).status).toBe(202);
  });

  it('keeps the allowance spent when the email provider fails', async () => {
    const h = await harness({ AUTH_EMAIL: { send: async () => Promise.reject(new Error('provider down')) } });
    for (let i = 0; i < 3; i++) {
      expect((await issuer.fetch(signInRequest('flaky@example.test'), h.env)).status).toBe(503);
    }
    expect((await issuer.fetch(signInRequest('flaky@example.test'), h.env)).status).toBe(429);
    expect(h.db.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_tokens').get()).toEqual({ n: 0 });
  });
});

describe('POST /verify', () => {
  it('requires an allowed or exact public origin and a request marker before consuming', async () => {
    const h = await harness({ ALLOWED_ORIGINS: 'http://127.0.0.1:5173' });
    await issuer.fetch(
      new Request(url('/sign-in'), {
        body: '{"email":"guard@example.test"}',
        headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5173', 'x-archive-request': '1' },
        method: 'POST',
      }),
      h.env,
    );
    const token = lastLinkToken(h.sent);
    const rejectedHeaders: Record<string, string>[] = [
      { 'content-type': 'application/json' },
      { 'content-type': 'application/json', origin: APP_ORIGIN },
      { 'content-type': 'application/json', origin: 'http://evil.example.test', 'x-archive-request': '1' },
      { 'content-type': 'application/json', origin: 'null', 'x-archive-request': '1' },
    ];
    for (const headers of rejectedHeaders) {
      expect(
        (
          await issuer.fetch(
            new Request(url('/verify'), { body: JSON.stringify({ token }), headers, method: 'POST' }),
            h.env,
          )
        ).status,
      ).toBe(403);
    }
    expect(h.db.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_tokens').get()).toEqual({ n: 1 });
    expect((await issuer.fetch(verifyRequest(token), h.env)).status).toBe(204);
  });

  it('rejects malformed confirmation bodies without redeeming a token', async () => {
    const h = await harness();
    await issuer.fetch(signInRequest('body@example.test'), h.env);
    const token = lastLinkToken(h.sent);
    for (const body of [{ extra: true, token }, { token: 1 }, { token: 'short' }, { other: token }, [token]]) {
      const response = await issuer.fetch(
        mutation('/verify', {
          body: JSON.stringify(body),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
        }),
        h.env,
      );
      expect(response.status).toBe(400);
    }
    expect(
      (
        await issuer.fetch(
          mutation(`/verify?token=${token}`, {
            body: JSON.stringify({ token }),
            headers: { 'content-type': 'application/json' },
            method: 'POST',
          }),
          h.env,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await issuer.fetch(
          mutation('/verify', {
            body: `token=${token}`,
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            method: 'POST',
          }),
          h.env,
        )
      ).status,
    ).toBe(415);
    expect(
      (
        await issuer.fetch(
          mutation('/verify', {
            body: JSON.stringify({ token: 'a'.repeat(200_000) }),
            headers: { 'content-type': 'application/json' },
            method: 'POST',
          }),
          h.env,
        )
      ).status,
    ).toBe(413);
    expect((await issuer.fetch(verifyRequest(token), h.env)).status).toBe(204);
  });

  it('redeems at most once concurrently and atomically stamps the account', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-12T10:00:00Z'), toFake: ['Date'] });
    const h = await harness();
    await issuer.fetch(signInRequest('race@example.test'), h.env);
    const token = lastLinkToken(h.sent);
    const responses = await Promise.all(Array.from({ length: 8 }, () => issuer.fetch(verifyRequest(token), h.env)));
    expect(responses.filter((response) => response.status === 204)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 410)).toHaveLength(7);
    expect(h.db.sqlite.prepare('SELECT last_sign_in_at FROM auth_users').get()).toEqual({
      last_sign_in_at: '2026-10-12T10:00:00.000Z',
    });
    expect(h.db.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_tokens').get()).toEqual({ n: 0 });
  });

  it('rolls back redemption when the account timestamp update fails and permits retry', async () => {
    const h = await harness();
    await issuer.fetch(signInRequest('rollback@example.test'), h.env);
    const token = lastLinkToken(h.sent);
    h.db.sqlite.exec(`CREATE TRIGGER fail_sign_in BEFORE UPDATE OF last_sign_in_at ON auth_users
      BEGIN SELECT RAISE(ABORT, 'private database error'); END;`);
    const failed = await issuer.fetch(verifyRequest(token), h.env);
    expect(failed.status).toBe(500);
    expect(failed.headers.get('set-cookie')).toBeNull();
    expect(await failed.text()).not.toContain('private database error');
    expect(h.db.sqlite.prepare('SELECT redeemed_at FROM auth_tokens').get()).toEqual({ redeemed_at: null });
    expect(h.db.sqlite.prepare('SELECT last_sign_in_at FROM auth_users').get()).toEqual({ last_sign_in_at: null });
    h.db.sqlite.exec('DROP TRIGGER fail_sign_in');
    expect((await issuer.fetch(verifyRequest(token), h.env)).status).toBe(204);
  });

  it('rolls back the timestamp when token removal fails', async () => {
    const h = await harness();
    await issuer.fetch(signInRequest('delete-failure@example.test'), h.env);
    const tokenHash = (h.db.sqlite.prepare('SELECT token_hash FROM auth_tokens').get() as { token_hash: string })
      .token_hash;
    h.db.sqlite.exec(`CREATE TRIGGER fail_token_delete BEFORE DELETE ON auth_tokens
      BEGIN SELECT RAISE(ABORT, 'private deletion error'); END;`);
    await expect(consumeToken(h.db, tokenHash, Date.now())).rejects.toThrow();
    expect(h.db.sqlite.prepare('SELECT last_sign_in_at FROM auth_users').get()).toEqual({ last_sign_in_at: null });
    expect(h.db.sqlite.prepare('SELECT redeemed_at FROM auth_tokens').get()).toEqual({ redeemed_at: null });
    h.db.sqlite.exec('DROP TRIGGER fail_token_delete');
    expect(await consumeToken(h.db, tokenHash, Date.now())).toMatchObject({ email: 'delete-failure@example.test' });
  });

  it('sets the contract session cookie once and refuses the reused link', async () => {
    const h = await harness();
    const verified = await signIn(h, 'reader@example.test');
    expect(verified.status).toBe(204);
    const cookie = verified.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api/v1');
    expect(cookie).toContain(`Max-Age=${SESSION_MAX_AGE_SECONDS}`);
    expect(cookie).not.toContain('Secure');
    const claims = decodeJwt(cookiePair(verified).split('=')[1]);
    expect(claims.roles).toBeUndefined();
    expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBe(SESSION_MAX_AGE_SECONDS);

    const again = await issuer.fetch(verifyRequest(lastLinkToken(h.sent)), h.env);
    expect(again.status).toBe(410);
  });

  describe('GET /verify confirmation', () => {
    const browser = (html: string, send: (path: string, init: RequestInit) => Promise<Response>) => {
      let click: (() => Promise<void>) | undefined;
      const node = () => ({
        addEventListener: (_type: string, handler: () => Promise<void>) => {
          click = handler;
        },
        disabled: false,
        focus: vi.fn(),
        hidden: true,
        removeAttribute: vi.fn(),
        setAttribute: vi.fn(),
        textContent: '',
      });
      const nodes: Record<string, ReturnType<typeof node>> = {
        actions: node(),
        confirm: node(),
        exit: { ...node(), hidden: false },
        recovery: node(),
        status: node(),
      };
      const events = new Map<string, (event: { persisted?: boolean }) => void>();
      const fetch = vi.fn(send);
      const location = { pathname: '/api/v1/auth/verify', replace: vi.fn() };
      const history = { replaceState: vi.fn() };
      const script = [...html.matchAll(/<script nonce="[^"]+">([\s\S]*?)<\/script>/g)]
        .map((match) => match[1])
        .join('\n');
      runInNewContext(script, {
        AbortController,
        addEventListener: (type: string, handler: (event: { persisted?: boolean }) => void) =>
          events.set(type, handler),
        clearTimeout,
        Date,
        document: { getElementById: (id: string) => nodes[id] },
        fetch,
        history,
        location,
        setTimeout,
      });
      return { click: () => click?.(), events, fetch, history, location, nodes };
    };

    const confirmation = async () => {
      const h = await harness();
      await issuer.fetch(signInRequest('interaction@example.test'), h.env);
      const token = lastLinkToken(h.sent);
      const page = await issuer.fetch(new Request(url(`/verify?token=${token}`)), h.env);
      return { h, html: await page.text(), page, token };
    };

    it('uses paper and copper with readable contrast in both confirmation themes', async () => {
      const { html } = await confirmation();
      const css = /<style nonce="[^"]+">([\s\S]*?)<\/style>/.exec(html)?.[1] ?? '';
      const luminance = (color: string) =>
        (color.slice(1).match(/../g) ?? []).reduce((total, channel, index) => {
          const value = Number.parseInt(channel, 16) / 255;
          return (
            total +
            (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index]
          );
        }, 0);
      const themes = [...css.matchAll(/:root \{([^}]+)\}/g)].map((match) =>
        Object.fromEntries([...match[1].matchAll(/--([a-z]+): (#[0-9a-f]{6})/g)].map((color) => [color[1], color[2]])),
      );
      expect(themes).toHaveLength(2);
      expect(themes[0]).toMatchObject({ accent: '#934b2b', paper: '#fcfbf9' });
      expect(themes[1]).toMatchObject({ accent: '#e0a07b', paper: '#242220' });
      for (const [index, theme] of themes.entries()) {
        for (const [foreground, background] of [
          [theme.ink, theme.paper],
          [theme.muted, theme.paper],
          [theme.accent, theme.paper],
          [index === 0 ? '#ffffff' : theme.paper, theme.accent],
          [index === 0 ? '#ffffff' : theme.paper, theme.hover],
        ]) {
          const light = Math.max(luminance(foreground), luminance(background));
          const dark = Math.min(luminance(foreground), luminance(background));
          expect((light + 0.05) / (dark + 0.05)).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(css).toContain("font-family: 'Iowan Old Style'");
      expect(css).toContain("'Avenir Next', 'Segoe UI', sans-serif");
    });

    it('links recovery and noscript directly to the fixed account route while retaining the root exit', async () => {
      const { html } = await confirmation();
      expect(html).toContain(`id="recovery" href="${APP_ORIGIN}/account" hidden>Request a new sign-in link</a>`);
      expect(html).toMatch(new RegExp(`<noscript>[\\s\\S]*href="${APP_ORIGIN}/account"`));
      expect(html).toContain(`<footer id="exit"><a href="${APP_ORIGIN}/">Back to app</a></footer>`);
    });

    it('runs confirmation script without network activity until clicked, then sends the guarded token body', async () => {
      const { h, html, page, token } = await confirmation();
      const script = /<script nonce="([^"]+)">([\s\S]*?)<\/script>/.exec(html);
      expect(script).not.toBeNull();
      expect(page.headers.get('content-security-policy')).toContain(`script-src 'nonce-${script?.[1]}'`);
      const view = browser(html, async (_path: string, init: RequestInit) => {
        const response = await issuer.fetch(
          new Request(url('/verify'), {
            ...init,
            headers: { ...(init.headers as Record<string, string>), origin: APP_ORIGIN },
          }),
          h.env,
        );
        expect(response.status).toBe(204);
        expect(response.headers.get('set-cookie')).not.toBeNull();
        return response;
      });
      expect(view.fetch).not.toHaveBeenCalled();
      expect(view.history.replaceState).toHaveBeenCalledWith(null, '', view.location.pathname);
      expect(view.nodes.confirm.focus).toHaveBeenCalledOnce();
      await view.click();
      expect(view.fetch).toHaveBeenCalledWith(
        view.location.pathname,
        expect.objectContaining({
          body: JSON.stringify({ token }),
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json', 'x-archive-request': '1' },
          method: 'POST',
          redirect: 'error',
          referrerPolicy: 'no-referrer',
        }),
      );
      expect(view.nodes.status.textContent).toContain('You are signed in');
      expect(view.location.replace).toHaveBeenCalledWith(`${APP_ORIGIN}/signed-in`);
    });

    it('announces pending state and blocks double clicks before the response arrives', async () => {
      const { html } = await confirmation();
      let finish: (response: Response) => void = () => undefined;
      const view = browser(
        html,
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
      const pending = view.click();
      expect(view.nodes.confirm.disabled).toBe(true);
      expect(view.nodes.confirm.textContent).toBe('Signing you in');
      expect(view.nodes.status.textContent).toContain('Signing you in');
      expect(view.nodes.actions.setAttribute).toHaveBeenCalledWith('aria-busy', 'true');
      await view.click();
      expect(view.fetch).toHaveBeenCalledOnce();
      finish(new Response(null, { status: 204 }));
      await pending;
      await view.click();
      expect(view.fetch).toHaveBeenCalledOnce();
      expect(view.nodes.actions.removeAttribute).toHaveBeenCalledWith('aria-busy');
    });

    it.each([400, 410])('offers new-link recovery rather than resubmission after HTTP %s', async (status) => {
      const { html } = await confirmation();
      const view = browser(html, async () => new Response(null, { status }));
      await view.click();
      expect(view.nodes.confirm.hidden).toBe(true);
      expect(view.nodes.recovery.hidden).toBe(false);
      expect(view.nodes.recovery.focus).toHaveBeenCalledOnce();
      expect(view.nodes.recovery.setAttribute).toHaveBeenCalledWith('class', 'primary');
      expect(view.nodes.exit.hidden).toBe(true);
      expect(view.nodes.status.textContent).toContain('Request a new sign-in link');
      expect(view.nodes.status.textContent).toMatch(status === 410 ? /expired or was already used/ : /not valid/);
      await view.click();
      expect(view.fetch).toHaveBeenCalledOnce();
      expect(view.location.replace).not.toHaveBeenCalled();
    });

    it.each([
      ['2', 2],
      ['999999999', 300],
      ['0', 1],
      ['-1', 30],
      ['1.5', 30],
      ['+1', 30],
      ['2026-01-01T00:00:04Z', 30],
      ['Thu, 01 Jan 2026 24:00:04 GMT', 30],
      ['invalid', 30],
      [null, 30],
      ['Thu, 01 Jan 2026 00:00:04 GMT', 4],
      ['Thursday, 01-Jan-26 00:00:04 GMT', 4],
      ['Thu Jan  1 00:00:04 2026', 4],
    ])('bounds Retry-After %s to %s seconds without automatic requests', async (retryAfter, seconds) => {
      const { html } = await confirmation();
      vi.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });
      const view = browser(
        html,
        async () =>
          new Response(null, {
            headers: retryAfter === null ? {} : { 'retry-after': retryAfter },
            status: 429,
          }),
      );
      await view.click();
      expect(view.nodes.confirm.disabled).toBe(true);
      expect(view.nodes.status.textContent).toContain(`Wait ${seconds} seconds`);
      expect(view.nodes.recovery.hidden).toBe(false);
      expect(view.nodes.recovery.setAttribute).not.toHaveBeenCalledWith('class', 'primary');
      expect(view.nodes.exit.hidden).toBe(true);
      await view.click();
      await vi.advanceTimersByTimeAsync((seconds - 1) * 1000);
      expect(view.nodes.confirm.disabled).toBe(true);
      await vi.advanceTimersByTimeAsync(1000);
      expect(view.nodes.confirm.disabled).toBe(false);
      expect(view.nodes.status.textContent).toContain('try signing in again now');
      expect(view.fetch).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
      await view.click();
      expect(view.fetch).toHaveBeenCalledTimes(2);
      view.events.get('pagehide')?.({});
      expect(vi.getTimerCount()).toBe(0);
    });

    it.each([503, 500, 200, 'network'])('allows deliberate retry after %s without navigating', async (failure) => {
      const { html } = await confirmation();
      const view = browser(html, async () => {
        if (failure === 'network') throw new Error('private network error');
        return new Response(null, { status: Number(failure) });
      });
      await view.click();
      expect(view.nodes.confirm.disabled).toBe(false);
      expect(view.nodes.confirm.textContent).toBe('Try again');
      expect(view.nodes.recovery.hidden).toBe(false);
      expect(view.nodes.status.textContent).toContain(
        failure === 503
          ? 'temporarily unavailable'
          : failure === 'network'
            ? 'Check your connection'
            : 'could not be completed',
      );
      expect(view.nodes.status.textContent).not.toContain('private');
      expect(view.location.replace).not.toHaveBeenCalled();
      await view.click();
      expect(view.fetch).toHaveBeenCalledTimes(2);
    });

    it.each([204, 400, 410, 429, 503, 500, 200])('cancels unused streaming bodies after HTTP %s', async (status) => {
      const { html } = await confirmation();
      vi.useFakeTimers();
      const cancel = vi.fn();
      const response = new Response(new ReadableStream({ cancel }), { status: status === 204 ? 200 : status });
      if (status === 204) vi.spyOn(response, 'status', 'get').mockReturnValue(204);
      const view = browser(html, async () => response);
      await view.click();
      expect(cancel).toHaveBeenCalledOnce();
      expect(view.fetch.mock.calls[0][1].signal?.aborted).toBe(true);
      expect(view.location.replace).toHaveBeenCalledTimes(status === 204 ? 1 : 0);
      view.events.get('pagehide')?.({});
      expect(vi.getTimerCount()).toBe(0);
    });

    it.each(['rejects', 'stalls'])('allows immediate 503 recovery even when body cancellation %s', async (failure) => {
      const { html } = await confirmation();
      vi.useFakeTimers();
      const cancel = vi.fn(() =>
        failure === 'rejects'
          ? Promise.reject(new Error('private cancellation failure'))
          : new Promise<void>(() => undefined),
      );
      const view = browser(html, async () => new Response(new ReadableStream({ cancel }), { status: 503 }));
      await view.click();
      expect(cancel).toHaveBeenCalledOnce();
      expect(view.nodes.confirm.disabled).toBe(false);
      expect(view.nodes.status.textContent).toContain('temporarily unavailable');
      expect(view.nodes.recovery.hidden).toBe(false);
      expect(view.fetch.mock.calls[0][1].signal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
      await view.click();
      expect(view.fetch).toHaveBeenCalledTimes(2);
    });

    it.each([204, 503])(
      'cancels stale streaming HTTP %s after pagehide and restored pageshow without changing fresh state',
      async (status) => {
        const { html } = await confirmation();
        vi.useFakeTimers();
        let finish: (response: Response) => void = () => undefined;
        const view = browser(
          html,
          () =>
            new Promise((resolve) => {
              finish = resolve;
            }),
        );
        const pending = view.click();
        const signal = view.fetch.mock.calls[0][1].signal;
        view.events.get('pagehide')?.({});
        expect(signal?.aborted).toBe(true);
        expect(vi.getTimerCount()).toBe(0);
        view.events.get('pageshow')?.({ persisted: true });
        expect(view.nodes.confirm.disabled).toBe(false);
        const finishStale = finish;
        const fresh = view.click();
        const freshSignal = view.fetch.mock.calls[1][1].signal;
        const finishFresh = finish;
        const cancel = vi.fn();
        const response = new Response(new ReadableStream({ cancel }), { status: status === 204 ? 200 : status });
        if (status === 204) vi.spyOn(response, 'status', 'get').mockReturnValue(204);
        finishStale(response);
        await pending;
        expect(cancel).toHaveBeenCalledOnce();
        expect(view.location.replace).not.toHaveBeenCalled();
        expect(view.nodes.status.textContent).toBe('Signing you in. Please wait.');
        expect(view.nodes.confirm.disabled).toBe(true);
        expect(freshSignal?.aborted).toBe(false);
        expect(vi.getTimerCount()).toBe(1);
        finishFresh(new Response(null, { status: 503 }));
        await fresh;
        expect(view.nodes.status.textContent).toContain('temporarily unavailable');
        expect(freshSignal?.aborted).toBe(true);
        expect(vi.getTimerCount()).toBe(0);
      },
    );

    it('times out stalled requests and releases the timeout on network rejection', async () => {
      const { html } = await confirmation();
      vi.useFakeTimers();
      const view = browser(
        html,
        (_path, init) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('timeout')));
          }),
      );
      const pending = view.click();
      await vi.advanceTimersByTimeAsync(15000);
      await pending;
      expect(view.nodes.confirm.disabled).toBe(false);
      expect(view.nodes.status.textContent).toContain('Sign-in took too long');
      expect(view.nodes.status.textContent).not.toContain('Check your connection');
      expect(vi.getTimerCount()).toBe(0);
    });

    it('restores the remaining cooldown after bfcache navigation without polling', async () => {
      const { html } = await confirmation();
      vi.useFakeTimers();
      const view = browser(html, async () => new Response(null, { headers: { 'retry-after': '3' }, status: 429 }));
      await view.click();
      view.events.get('pagehide')?.({});
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(1000);
      view.events.get('pageshow')?.({ persisted: true });
      expect(view.nodes.confirm.textContent).toBe('Try again in 2s');
      await vi.advanceTimersByTimeAsync(2000);
      expect(view.nodes.confirm.disabled).toBe(false);
      expect(view.fetch).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('allows repeated scanner GETs without consuming links or setting cookies', async () => {
      const h = await harness();
      await issuer.fetch(signInRequest('scanner@example.test'), h.env);
      const token = lastLinkToken(h.sent);
      for (let i = 0; i < 3; i++) {
        const response = await issuer.fetch(new Request(url(`/verify?token=${token}`)), h.env);
        expect(response.status).toBe(200);
        expect(response.headers.get('set-cookie')).toBeNull();
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(response.headers.get('referrer-policy')).toBe('no-referrer');
        expect(response.headers.get('content-security-policy')).toMatch(
          /default-src 'none'.*connect-src 'self'.*frame-ancestors 'none'/,
        );
        const html = await response.text();
        const styleNonce = /<style nonce="([^"]+)">/.exec(html)?.[1];
        expect(styleNonce).toBeTruthy();
        expect(response.headers.get('content-security-policy')).toContain(`style-src 'nonce-${styleNonce}'`);
        expect(html).toContain('<main');
        expect(html).toContain('<noscript>');
        expect(html).toContain(`href="${APP_ORIGIN}/"`);
        expect(html).toContain("addEventListener('click'");
        expect(html).toContain('history.replaceState');
        expect(html).toContain("'x-archive-request': '1'");
        expect(html).toContain('Test &#60;App&#62;');
        expect(html).not.toMatch(/<form|<img|<link|src=/);
        expect(h.db.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_tokens').get()).toEqual({ n: 1 });
        expect(h.db.sqlite.prepare('SELECT last_sign_in_at FROM auth_users').get()).toEqual({ last_sign_in_at: null });
      }
      expect((await issuer.fetch(verifyRequest(token), h.env)).status).toBe(204);
      expect((await issuer.fetch(new Request(url(`/verify?token=${token}`)), h.env)).status).toBe(200);
      const malformed = await issuer.fetch(new Request(url('/verify?token=short')), h.env);
      expect(malformed.status).toBe(400);
      expect(malformed.headers.get('referrer-policy')).toBe('no-referrer');
      expect(malformed.headers.get('content-type')).toContain('text/html');
      expect(await malformed.text()).toContain('This sign-in link is not valid');
    });

    it('escapes branding and keeps the token only in the original private script', async () => {
      const name = '<script>alert("x")</script> &\'';
      const escaped = '&#60;script&#62;alert(&#34;x&#34;)&#60;/script&#62; &#38;&#39;';
      const h = await harness({ APP_NAME: name });
      const token = 'a'.repeat(43);
      const page = await issuer.fetch(new Request(url(`/verify?token=${token}`)), h.env);
      const html = await page.text();
      const csp = page.headers.get('content-security-policy') ?? '';
      const scriptNonces = [...html.matchAll(/<script nonce="([^"]+)">/g)].map((match) => match[1]);
      expect(scriptNonces).toHaveLength(2);
      expect(new Set(scriptNonces).size).toBe(1);
      expect(html).toContain(`<title>Confirm sign-in | ${escaped}</title>`);
      expect(html).toContain(`Sign in to ${escaped}</h1>`);
      expect(html).not.toContain(name);
      expect(html.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')).not.toContain(token);
      expect(csp).toContain(`style-src 'nonce-${scriptNonces[0]}'`);
      expect(csp).not.toMatch(/unsafe-inline|https?:|data:/);
      expect(html).toContain('aria-labelledby="title"');
      expect(html).toContain('aria-live="polite" aria-atomic="true"');
      expect(html).toContain('min-height: 44px');
      expect(html).toContain('prefers-color-scheme: dark');
      expect(html).toContain('prefers-reduced-motion: reduce');
      expect(html).toContain('<button type="button" id="confirm" hidden>');
      expect(html).toContain('JavaScript is required to confirm this sign-in');
      const view = browser(html, async () => new Response(null, { status: 410 }));
      expect(view.fetch).not.toHaveBeenCalled();
      await view.click();
      expect(view.nodes.status.textContent).toContain('expired');
    });

    it.each([
      '',
      '?token=short',
      `?token=${'a'.repeat(43)}&token=${'b'.repeat(43)}`,
      `?token=${'a'.repeat(43)}&next=https://evil.test`,
    ])(
      'renders branded 400 HTML for invalid GET query %s without echoing input or changing POST errors',
      async (query) => {
        const h = await harness();
        const response = await issuer.fetch(new Request(url(`/verify${query}`)), h.env);
        expect(response.status).toBe(400);
        expect(response.headers.get('set-cookie')).toBeNull();
        expect(response.headers.get('content-type')).toContain('text/html');
        const html = await response.text();
        expect(html).toContain('Test &#60;App&#62;');
        expect(html).toContain(`href="${APP_ORIGIN}/account"`);
        expect(html).toContain('class="primary" id="recovery"');
        expect(html).toContain('Request a new sign-in link');
        expect(html).not.toContain('<footer');
        expect(html).not.toMatch(/evil.test|id="confirm"|fetch\(/);
        expect(html).not.toContain('a'.repeat(43));
        expect(html).not.toContain('b'.repeat(43));
        const view = browser(html, async () => new Response(null, { status: 204 }));
        expect(view.history.replaceState).toHaveBeenCalledOnce();
        expect(view.fetch).not.toHaveBeenCalled();
        const post = await issuer.fetch(verifyRequest('short'), h.env);
        expect(post.status).toBe(400);
        expect(post.headers.get('content-type')).toContain('application/json');
        expect(archiveErrorResponseSchema.parse(await post.json()).error.code).toBe('bad-request');
      },
    );
  });

  describe('auth observations', () => {
    it('emits finite sanitized request labels, codes and diagnostic categories', async () => {
      const worker = createAuthWorker();
      const events: AuthEvent[] = [];
      worker.tap((event) => events.push(event));
      const h = await harness();
      h.db.failOn('INSERT INTO auth_users');
      await worker.fetch(signInRequest('private@example.test'), h.env);
      expect(events.at(-1)).toMatchObject({
        code: 'internal',
        diagnostic: { kind: 'database' },
        route: '/auth/sign-in',
        status: 500,
        type: 'request',
      });
      await worker.fetch(new Request(url(`/unknown?token=${'a'.repeat(43)}`)), h.env);
      expect(events.at(-1)).toMatchObject({ code: 'not-found', route: 'unmatched', status: 404, type: 'request' });
      await worker.fetch(new Request(url('/jwks.json')), h.env);
      expect(events.at(-1)).toMatchObject({ code: 'ok', route: '/auth/jwks.json', status: 200, type: 'request' });
      expect(JSON.stringify(events)).not.toMatch(/private@example|D1_ERROR|aaaaaa|unknown\?/);
      expect(log).not.toHaveBeenCalled();
    });

    it('classifies configuration and provider failures without exposing their payloads', async () => {
      const worker = createAuthWorker();
      const events: AuthEvent[] = [];
      worker.tap((event) => events.push(event));
      const invalid = await harness({ APP_ENV: 'private-config' });
      await worker.fetch(new Request(url('/jwks.json')), invalid.env);
      expect(events.at(-1)).toMatchObject({ diagnostic: { kind: 'configuration' } });
      const h = await harness({
        AUTH_EMAIL: {
          send: async () => {
            throw new Error('token=private-provider-secret');
          },
        },
      });
      await worker.fetch(signInRequest('private@example.test'), h.env);
      expect(events.at(-1)).toMatchObject({ diagnostic: { kind: 'email' }, status: 503 });
      expect(JSON.stringify(events)).not.toMatch(/private-config|private-provider|private@example/);
      await expect(worker.scheduled(undefined, invalid.env)).rejects.toThrow();
      expect(events.at(-1)).toEqual({ diagnostic: { kind: 'configuration' }, status: 'failed', type: 'scheduled' });
    });

    it('detaches subscriptions on abort and explicit unsubscribe, with pre-aborted signals inert', async () => {
      const worker = createAuthWorker();
      const h = await harness();
      const handler = vi.fn();
      const controller = new AbortController();
      const unsubscribe = worker.tap(handler, { signal: controller.signal });
      const stopped = new AbortController();
      stopped.abort();
      worker.tap(handler, { signal: stopped.signal });
      await worker.fetch(new Request(url('/jwks.json')), h.env);
      expect(handler).toHaveBeenCalledTimes(1);
      controller.abort();
      unsubscribe();
      await worker.fetch(new Request(url('/jwks.json')), h.env);
      expect(handler).toHaveBeenCalledTimes(1);
      const detach = worker.tap(handler);
      detach();
      await worker.fetch(new Request(url('/jwks.json')), h.env);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('observes scheduled success and failure while observer errors remain inert and failures rethrow', async () => {
      vi.useFakeTimers({ now: 1_000_000, toFake: ['Date'] });
      const worker = createAuthWorker();
      const events: AuthEvent[] = [];
      worker.tap(() => {
        throw new Error('observer failed');
      });
      worker.tap((event) => events.push(event));
      const h = await harness();
      expect((await worker.fetch(signInRequest('sweep@example.test'), h.env)).status).toBe(202);
      vi.setSystemTime(1_000_000 + 3_600_000);
      await worker.scheduled(undefined, h.env);
      expect(events.at(-1)).toEqual({ removed: 3, status: 'ok', type: 'scheduled' });
      h.db.failOn('DELETE FROM auth_tokens');
      await expect(worker.scheduled(undefined, h.env)).rejects.toThrow();
      expect(events.at(-1)).toEqual({ diagnostic: { kind: 'database' }, status: 'failed', type: 'scheduled' });
      expect(log).not.toHaveBeenCalled();
    });
  });

  it('mints one-hour operator sessions for the roster', async () => {
    const h = await harness();
    const verified = await signIn(h, 'op@example.test');
    expect(verified.headers.get('set-cookie')).toContain(`Max-Age=${OPERATOR_SESSION_MAX_AGE_SECONDS}`);
    const claims = decodeJwt(cookiePair(verified).split('=')[1]);
    expect(claims.roles).toEqual([ARCHIVE_OPERATOR_ROLE]);
    expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBe(OPERATOR_SESSION_MAX_AGE_SECONDS);
  });

  it.each([
    [901, 200],
    [3599, 200],
    [3604, 200],
    [3605, 401],
  ])('validates a minted operator session after %i seconds with status %i', async (age, status) => {
    vi.useFakeTimers({ now: new Date('2026-10-12T10:00:00Z'), toFake: ['Date'] });
    const h = await harness();
    const cookie = cookiePair(await signIn(h, 'op@example.test'));
    vi.setSystemTime(Date.now() + age * 1000);
    expect((await issuer.fetch(new Request(url('/session'), { headers: { cookie } }), h.env)).status).toBe(status);
  });

  it('rejects operator tokens declaring more than one hour of authority', async () => {
    const h = await harness();
    const claims = decodeJwt(cookiePair(await signIn(h, 'op@example.test')).split('=')[1]);
    const key = await importJWK(JSON.parse(h.env.AUTH_JWT_PRIVATE_JWK), 'RS256');
    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256' })
      .setExpirationTime((claims.iat ?? 0) + 3601)
      .sign(key);
    const response = await issuer.fetch(
      new Request(url('/session'), { headers: { cookie: `archive_session=${token}` } }),
      h.env,
    );
    expect(response.status).toBe(401);
  });

  it('still revokes an operator session immediately during its extended lifetime', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-12T10:00:00Z'), toFake: ['Date'] });
    const h = await harness();
    const cookie = cookiePair(await signIn(h, 'op@example.test'));
    vi.setSystemTime(Date.now() + 1800_000);
    const request = () => new Request(url('/session'), { headers: { cookie } });
    expect((await issuer.fetch(request(), h.env)).status).toBe(200);
    h.db.sqlite.prepare('UPDATE auth_users SET session_version = session_version + 1').run();
    expect((await issuer.fetch(request(), h.env)).status).toBe(401);
  });

  it('refuses an expired link', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-12T10:00:00Z'), toFake: ['Date'] });
    const h = await harness();
    await issuer.fetch(signInRequest('late@example.test'), h.env);
    vi.setSystemTime(new Date('2026-10-12T10:15:00Z'));
    const response = await issuer.fetch(verifyRequest(lastLinkToken(h.sent)), h.env);
    expect(response.status).toBe(410);
  });

  it('rejects malformed tokens and unknown query parameters with 400', async () => {
    const h = await harness();
    expect((await issuer.fetch(new Request(url('/verify?token=short')), h.env)).status).toBe(400);
    expect((await issuer.fetch(new Request(url(`/verify?token=${'a'.repeat(43)}&x=1`)), h.env)).status).toBe(400);
  });
});

describe('scheduled sweep', () => {
  it('removes expired links, closed windows and never-verified accounts but keeps signed-in ones', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-12T10:00:00Z'), toFake: ['Date'] });
    const h = await harness();
    await signIn(h, 'kept@example.test');
    await issuer.fetch(signInRequest('abandoned@example.test'), h.env);

    vi.setSystemTime(new Date('2026-10-12T10:30:00Z'));
    await issuer.scheduled(undefined, h.env);
    expect(h.db.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_tokens').get()).toEqual({ n: 0 });
    expect(userCount(h)).toBe(2);

    vi.setSystemTime(new Date('2026-10-12T11:00:01Z'));
    await issuer.scheduled(undefined, h.env);
    expect(h.db.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_link_budget').get()).toEqual({ n: 0 });
    expect(h.db.sqlite.prepare('SELECT email FROM auth_users').all()).toEqual([{ email: 'kept@example.test' }]);
  });
});

describe('GET /jwks.json', () => {
  it('publishes the active key and retired public keys without private members', async () => {
    const retired = await rsaPrivateJwk();
    const { d: _d, p: _p, q: _q, dp: _dp, dq: _dq, qi: _qi, ...retiredPublic } = retired;
    const h = await harness({ AUTH_JWT_PREVIOUS_PUBLIC_JWKS: JSON.stringify({ keys: [retiredPublic] }) });
    const response = await issuer.fetch(new Request(url('/jwks.json')), h.env);
    expect(response.status).toBe(200);
    const { keys } = (await response.json()) as { keys: Record<string, unknown>[] };
    expect(keys).toHaveLength(2);
    for (const key of keys) {
      expect(Object.keys(key).sort()).toEqual(['alg', 'e', 'kid', 'kty', 'n', 'use']);
    }
    const verified = await signIn(h, 'reader@example.test');
    expect(decodeProtectedHeader(cookiePair(verified).split('=')[1]).kid).toBe(keys[0].kid);
  });

  it('keeps sessions minted before a rotation valid while the old key is listed', async () => {
    const before = await harness();
    const session = cookiePair(await signIn(before, 'rotated@example.test'));
    const oldKey = JSON.parse(before.env.AUTH_JWT_PRIVATE_JWK) as Record<string, string>;
    const oldPublic = { e: oldKey.e, kty: 'RSA', n: oldKey.n };

    const rotated = { ...before.env, AUTH_JWT_PRIVATE_JWK: JSON.stringify(await rsaPrivateJwk()) };
    const withOverlap = { ...rotated, AUTH_JWT_PREVIOUS_PUBLIC_JWKS: JSON.stringify({ keys: [oldPublic] }) };
    const exported = await issuer.fetch(new Request(url('/account'), { headers: { cookie: session } }), withOverlap);
    expect(exported.status).toBe(200);

    const withoutOverlap = await issuer.fetch(new Request(url('/account'), { headers: { cookie: session } }), rotated);
    expect(withoutOverlap.status).toBe(401);
  });
});

describe('GET /account', () => {
  it('exports the account record and nothing else', async () => {
    const h = await harness();
    const session = cookiePair(await signIn(h, 'export@example.test'));
    const response = await issuer.fetch(new Request(url('/account'), { headers: { cookie: session } }), h.env);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = archiveAccountSchema.parse(await response.json());
    expect(Object.keys(body).sort()).toEqual(['createdAt', 'email', 'id', 'lastSignInAt']);
    expect(body.email).toBe('export@example.test');
    expect(typeof body.lastSignInAt).toBe('string');
  });

  it.each([
    ['no session cookie', undefined],
    ['a forged session', 'archive_session=eyJhbGciOiJSUzI1NiJ9.e30.c2ln'],
  ])('answers 401 for %s', async (_label, cookie) => {
    const h = await harness();
    const headers: Record<string, string> = cookie === undefined ? {} : { cookie };
    const response = await issuer.fetch(new Request(url('/account'), { headers }), h.env);
    expect(response.status).toBe(401);
  });
});

describe('DELETE /account', () => {
  const PUBLISHER = '0f8fad5b-d9cb-469f-a165-70867728950e';
  const erase = (cookie: string | undefined): Request =>
    mutation('/account', {
      headers: {
        ...(cookie === undefined ? {} : { cookie, [ACCOUNT_HEADER]: decodeJwt(cookie.split('=')[1]).sub ?? '' }),
        'x-archive-publisher': PUBLISHER,
      },
      method: 'DELETE',
    });

  it('erases the catalog profile with the caller session, then the account, then expires the cookie', async () => {
    const h = await harness();
    const session = cookiePair(await signIn(h, 'gone@example.test'));
    const response = await issuer.fetch(erase(session), h.env);
    expect(response.status).toBe(204);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(userCount(h)).toBe(0);

    expect(h.archiveCalls).toHaveLength(1);
    const call = h.archiveCalls[0];
    expect(call.method).toBe('DELETE');
    expect(call.url).toBe(`${APP_ORIGIN}/api/v1/me/account`);
    expect(call.headers.get('cookie')).toBe(session);
    expect(call.headers.get('origin')).toBe(APP_ORIGIN);
    expect(call.headers.get('x-archive-request')).toBe('1');
    expect(call.headers.get('x-archive-publisher')).toBe(PUBLISHER);

    // An absent issuer account no longer authorizes even an erasure retry.
    expect((await issuer.fetch(erase(session), h.env)).status).toBe(401);
  });

  it('propagates a catalog failure, keeps the session and the account, and succeeds on retry', async () => {
    let fail = true;
    const h = await harness({}, async () =>
      fail
        ? Response.json(
            {
              error: {
                code: 'publisher-changed',
                message: 'The signed-in publisher changed.',
                requestId: '6f1d2c3a-1b2c-4d5e-8f90-123456789abc',
              },
            },
            { status: 409 },
          )
        : new Response(null, { status: 204 }),
    );
    const session = cookiePair(await signIn(h, 'retry@example.test'));
    const failed = await issuer.fetch(erase(session), h.env);
    expect(failed.status).toBe(409);
    expect(failed.headers.get('set-cookie')).toBeNull();
    expect(await failed.json()).toEqual({
      error: {
        code: 'publisher-changed',
        message: 'The signed-in publisher changed.',
        requestId: '6f1d2c3a-1b2c-4d5e-8f90-123456789abc',
      },
    });
    expect(userCount(h)).toBe(1);

    fail = false;
    const retried = await issuer.fetch(erase(session), h.env);
    expect(retried.status).toBe(204);
    expect(userCount(h)).toBe(0);
  });

  it.each([
    ['a catalog 200 without erasure acknowledgement', async () => new Response(null, { status: 200 })],
    ['a catalog 202 without erasure acknowledgement', async () => new Response(null, { status: 202 })],
    ['an unreachable catalog', async () => Promise.reject(new Error('connect ECONNREFUSED'))],
    ['an unrecognizable catalog failure', async () => new Response('<html>oops</html>', { status: 502 })],
  ])('answers 503 for %s without clearing the session', async (_label, archive) => {
    const h = await harness({}, archive);
    const session = cookiePair(await signIn(h, 'outage@example.test'));
    const response = await issuer.fetch(erase(session), h.env);
    expect(response.status).toBe(503);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(userCount(h)).toBe(1);
  });

  it('keeps the session when the issuer delete fails after the catalog erased, and finishes on retry', async () => {
    const h = await harness();
    const session = cookiePair(await signIn(h, 'half@example.test'));
    h.db.failOn('DELETE FROM auth_users');
    const failed = await issuer.fetch(erase(session), h.env);
    expect(failed.status).toBe(500);
    expect(failed.headers.get('set-cookie')).toBeNull();
    expect(userCount(h)).toBe(1);

    const switched = cookiePair(await signIn(h, 'another@example.test'));
    const stale = mutation('/account', {
      headers: { cookie: switched, [ACCOUNT_HEADER]: decodeJwt(session.split('=')[1]).sub ?? '' },
      method: 'DELETE',
    });
    const rejected = await issuer.fetch(stale, h.env);
    expect(rejected.status).toBe(409);
    expect(await errorCode(rejected)).toBe('account-changed');
    expect(h.archiveCalls).toHaveLength(1);

    const retried = await issuer.fetch(erase(session), h.env);
    expect(retried.status).toBe(204);
    expect(h.archiveCalls).toHaveLength(2);
    expect(userCount(h)).toBe(1);
  });

  it.each([undefined, '', 'not-a-uuid'])(
    'refuses a missing or invalid account precondition (%s) before cleanup',
    async (account) => {
      const h = await harness();
      const session = cookiePair(await signIn(h, 'required@example.test'));
      const response = await issuer.fetch(
        mutation('/account', {
          headers: { cookie: session, ...(account === undefined ? {} : { [ACCOUNT_HEADER]: account }) },
          method: 'DELETE',
        }),
        h.env,
      );
      expect(response.status).toBe(400);
      expect(await errorCode(response)).toBe('bad-request');
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(h.archiveCalls).toHaveLength(0);
      expect(userCount(h)).toBe(1);
    },
  );

  it('rejects a switched email-only account before cleanup and preserves both accounts', async () => {
    const h = await harness();
    const original = cookiePair(await signIn(h, 'original@example.test'));
    const switched = cookiePair(await signIn(h, 'switched@example.test'));
    const response = await issuer.fetch(
      mutation('/account', {
        headers: { cookie: switched, [ACCOUNT_HEADER]: decodeJwt(original.split('=')[1]).sub ?? '' },
        method: 'DELETE',
      }),
      h.env,
    );
    expect(response.status).toBe(409);
    const parsed = archiveErrorResponseSchema.parse(await response.json());
    expect(parsed.error.code).toBe('account-changed');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(h.archiveCalls).toHaveLength(0);
    expect(userCount(h)).toBe(2);
    const own = mutation('/account', {
      headers: { cookie: switched, [ACCOUNT_HEADER]: decodeJwt(switched.split('=')[1]).sub ?? '' },
      method: 'DELETE',
    });
    expect((await issuer.fetch(own, h.env)).status).toBe(204);
    expect(userCount(h)).toBe(1);
  });

  it('refuses unguarded or anonymous erasure before calling the catalog', async () => {
    const h = await harness();
    const session = cookiePair(await signIn(h, 'guarded@example.test'));
    const unguarded = new Request(url('/account'), { headers: { cookie: session }, method: 'DELETE' });
    expect((await issuer.fetch(unguarded, h.env)).status).toBe(403);
    expect((await issuer.fetch(erase(undefined), h.env)).status).toBe(401);
    expect(h.archiveCalls).toHaveLength(0);
  });
});

describe('CORS', () => {
  it('answers preflight for allowed origins only', async () => {
    const h = await harness();
    const allowed = await issuer.fetch(
      new Request(url('/account'), { headers: { origin: APP_ORIGIN }, method: 'OPTIONS' }),
      h.env,
    );
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('access-control-allow-origin')).toBe(APP_ORIGIN);
    expect(allowed.headers.get('access-control-allow-methods')).toBe('GET, DELETE, OPTIONS');
    expect(allowed.headers.get('access-control-allow-headers')).toContain(ACCOUNT_HEADER);
    expect(allowed.headers.get('access-control-allow-credentials')).toBe('true');
    const foreign = await issuer.fetch(
      new Request(url('/account'), { headers: { origin: 'http://evil.example.test' }, method: 'OPTIONS' }),
      h.env,
    );
    expect(foreign.status).toBe(403);
    expect(foreign.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('lets allowed origins read error responses', async () => {
    const h = await harness();
    const response = await issuer.fetch(new Request(url('/account'), { headers: { origin: APP_ORIGIN } }), h.env);
    expect(response.status).toBe(401);
    expect(response.headers.get('access-control-allow-origin')).toBe(APP_ORIGIN);
  });
});
