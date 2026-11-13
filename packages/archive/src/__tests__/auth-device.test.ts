import { afterEach, describe, expect, it, vi } from 'vitest';
import { sha256Hex } from '../_crypto';
import { createAuthWorker } from '../auth';
import { cookiePair, harness, lastLinkToken, mutation, signInRequest, verifyRequest } from './auth-fixture';

const issuer = createAuthWorker();
afterEach(() => vi.useRealTimers());
const proof = 'A'.repeat(43);
const post = (path: string, body: unknown): Request =>
  mutation(path, {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

describe('device sign-in', () => {
  it('only signs the initiating app in after an explicit email confirmation', async () => {
    const h = await harness();
    const challenge = await sha256Hex(proof);
    expect(
      (await issuer.fetch(post('/device/sign-in', { challenge, email: 'player@example.test' }), h.env)).status,
    ).toBe(202);
    const match = /device\/approve\?token=([A-Za-z0-9._-]+)/.exec(h.sent[0].text);
    if (!match) throw new Error('Missing device approval link');
    const token = match[1];
    const payload = JSON.parse(atob(token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))) as {
      token: string;
    };
    expect((await issuer.fetch(post('/device/claim', { token: payload.token }), h.env)).status).toBe(202);
    const page = await issuer.fetch(mutation(`/device/approve?token=${token}`), h.env);
    expect(page.status).toBe(200);
    expect(page.headers.get('set-cookie')).toBeNull();
    const html = await page.text();
    expect(html).toContain('not this browser');
    expect(html).toContain(challenge.slice(0, 8).toUpperCase());
    expect((await issuer.fetch(post('/device/claim', { token: proof }), h.env)).status).toBe(202);
    const approval = await issuer.fetch(post('/device/approve', { token }), h.env);
    expect(approval.status).toBe(204);
    expect(approval.headers.get('set-cookie')).toBeNull();
    expect((await issuer.fetch(post('/verify', { token: proof }), h.env)).status).toBe(410);
    expect((await issuer.fetch(post('/device/claim', { token: 'B'.repeat(43) }), h.env)).status).toBe(202);
    const claimed = await issuer.fetch(post('/device/claim', { token: proof }), h.env);
    expect(claimed.status).toBe(204);
    expect(cookiePair(claimed)).toMatch(/^archive_session=/);
    expect((await issuer.fetch(post('/device/claim', { token: proof }), h.env)).status).toBe(202);
    expect((await issuer.fetch(post('/device/approve', { token }), h.env)).status).toBe(410);
    h.db.sqlite.close();
  });

  it('answers a second approval of the same challenge with 410, keeping the first claim live', async () => {
    const h = await harness();
    const challenge = await sha256Hex(proof);
    for (const email of ['dup@example.test', 'dup2@example.test']) {
      expect((await issuer.fetch(post('/device/sign-in', { challenge, email }), h.env)).status).toBe(202);
    }
    const tokens = h.sent.map((sent) => /device\/approve\?token=([A-Za-z0-9._-]+)/.exec(sent.text)?.[1]);
    if (!tokens[0] || !tokens[1]) throw new Error('Missing device approval links');
    expect((await issuer.fetch(post('/device/approve', { token: tokens[0] }), h.env)).status).toBe(204);
    expect((await issuer.fetch(post('/device/approve', { token: tokens[1] }), h.env)).status).toBe(410);
    const claimed = await issuer.fetch(post('/device/claim', { token: proof }), h.env);
    expect(claimed.status).toBe(204);
    expect(cookiePair(claimed)).toMatch(/^archive_session=/);
    h.db.sqlite.close();
  });

  it('rejects altered approval links and honors revocation before approval', async () => {
    const h = await harness();
    const challenge = await sha256Hex(proof);
    expect(
      (await issuer.fetch(post('/device/sign-in', { challenge, email: 'player@example.test' }), h.env)).status,
    ).toBe(202);
    const match = /device\/approve\?token=([A-Za-z0-9._-]+)/.exec(h.sent[0].text);
    if (!match) throw new Error('Missing device approval link');
    const token = match[1];
    expect((await issuer.fetch(post('/device/approve', { token: `${token.slice(0, -2)}AA` }), h.env)).status).toBe(410);
    h.db.sqlite.prepare('UPDATE auth_users SET session_version = session_version + 1').run();
    expect((await issuer.fetch(post('/device/approve', { token }), h.env)).status).toBe(410);
    expect((await issuer.fetch(post('/device/claim', { token: proof }), h.env)).status).toBe(202);
    h.db.sqlite.close();
  });

  it('does not replace an existing verified account when a device proof is claimed', async () => {
    const h = await harness();
    await issuer.fetch(signInRequest('existing@example.test'), h.env);
    const existing = await issuer.fetch(verifyRequest(lastLinkToken(h.sent)), h.env);
    const cookie = cookiePair(existing);
    await issuer.fetch(
      post('/device/sign-in', { challenge: await sha256Hex(proof), email: 'new@example.test' }),
      h.env,
    );
    const match = /device\/approve\?token=([A-Za-z0-9._-]+)/.exec(h.sent.at(-1)?.text ?? '');
    if (!match) throw new Error('Missing device approval link');
    expect((await issuer.fetch(post('/device/approve', { token: match[1] }), h.env)).status).toBe(204);
    const guarded = await issuer.fetch(
      mutation('/device/claim', {
        body: JSON.stringify({ token: proof }),
        headers: { 'content-type': 'application/json', cookie },
        method: 'POST',
      }),
      h.env,
    );
    expect(guarded.status).toBe(409);
    expect(guarded.headers.get('set-cookie')).toBeNull();
    h.db.sqlite
      .prepare('UPDATE auth_users SET session_version = session_version + 1 WHERE email = ?')
      .run('existing@example.test');
    const stale = await issuer.fetch(
      mutation('/device/claim', {
        body: JSON.stringify({ token: proof }),
        headers: { 'content-type': 'application/json', cookie },
        method: 'POST',
      }),
      h.env,
    );
    expect(stale.status).toBe(204);
    h.db.sqlite.close();
  });

  it('revokes an approved proof and allows at most one concurrent claim', async () => {
    const h = await harness();
    const request = async (email: string): Promise<string> => {
      await issuer.fetch(post('/device/sign-in', { challenge: await sha256Hex(proof), email }), h.env);
      const match = /device\/approve\?token=([A-Za-z0-9._-]+)/.exec(h.sent.at(-1)?.text ?? '');
      if (!match) throw new Error('Missing device approval link');
      return match[1];
    };
    const first = await request('revoked@example.test');
    expect((await issuer.fetch(post('/device/approve', { token: first }), h.env)).status).toBe(204);
    h.db.sqlite
      .prepare('UPDATE auth_users SET session_version = session_version + 1 WHERE email = ?')
      .run('revoked@example.test');
    expect((await issuer.fetch(post('/device/claim', { token: proof }), h.env)).status).toBe(202);
    const second = await request('claim@example.test');
    expect((await issuer.fetch(post('/device/approve', { token: second }), h.env)).status).toBe(204);
    const claims = await Promise.all(
      Array.from({ length: 5 }, () => issuer.fetch(post('/device/claim', { token: proof }), h.env)),
    );
    expect(claims.filter((response) => response.status === 204)).toHaveLength(1);
    expect(claims.filter((response) => response.status === 202)).toHaveLength(4);
    h.db.sqlite.close();
  });

  it('rolls back approval when the token exchange fails', async () => {
    const h = await harness();
    const challenge = await sha256Hex(proof);
    await issuer.fetch(post('/device/sign-in', { challenge, email: 'player@example.test' }), h.env);
    const match = /device\/approve\?token=([A-Za-z0-9._-]+)/.exec(h.sent[0].text);
    if (!match) throw new Error('Missing device approval link');
    h.db.failOn('DELETE FROM auth_tokens WHERE token_hash');
    expect((await issuer.fetch(post('/device/approve', { token: match[1] }), h.env)).status).toBe(500);
    expect((await issuer.fetch(post('/device/claim', { token: proof }), h.env)).status).toBe(202);
    expect((await issuer.fetch(post('/device/approve', { token: match[1] }), h.env)).status).toBe(204);
    h.db.sqlite.close();
  });

  it('approves at most once under concurrent requests and expires unclaimed proofs', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-12T10:00:00Z'), toFake: ['Date'] });
    const h = await harness();
    await issuer.fetch(
      post('/device/sign-in', { challenge: await sha256Hex(proof), email: 'player@example.test' }),
      h.env,
    );
    const match = /device\/approve\?token=([A-Za-z0-9._-]+)/.exec(h.sent[0].text);
    if (!match) throw new Error('Missing device approval link');
    const approvals = await Promise.all(
      Array.from({ length: 5 }, () => issuer.fetch(post('/device/approve', { token: match[1] }), h.env)),
    );
    expect(approvals.filter((response) => response.status === 204)).toHaveLength(1);
    expect(approvals.filter((response) => response.status === 410)).toHaveLength(4);
    vi.advanceTimersByTime(15 * 60 * 1000);
    expect((await issuer.fetch(post('/device/claim', { token: proof }), h.env)).status).toBe(202);
    const expiredPage = await issuer.fetch(mutation(`/device/approve?token=${match[1]}`), h.env);
    expect(expiredPage.status).toBe(410);
    expect(expiredPage.headers.get('content-type')).toMatch(/^text\/html/);
    expect(await expiredPage.text()).toContain('Request a new sign-in link');
    h.db.sqlite.close();
  });

  it('requires an allowed origin and request marker for requests and claims', async () => {
    const h = await harness();
    for (const [path, body] of [
      ['/device/sign-in', { challenge: await sha256Hex(proof), email: 'player@example.test' }],
      ['/device/claim', { token: proof }],
    ] as const) {
      const request = new Request(`http://127.0.0.1:8789/api/v1/auth${path}`, {
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
        method: 'POST',
      });
      expect((await issuer.fetch(request, h.env)).status).toBe(403);
    }
    expect(h.sent).toHaveLength(0);
    h.db.sqlite.close();
  });
});
