import { decodeJwt } from 'jose';
import { describe, expect, it } from 'vitest';
import { createAuthWorker } from '../auth';
import { ACCOUNT_HEADER } from '../contract';
import { cookiePair, harness, lastLinkToken, mutation, signInRequest, verifyRequest } from './auth-fixture';

describe('account re-enrollment', () => {
  it('reuses the email account until erasure, then mints a fresh principal on sign-in', async () => {
    const h = await harness();
    const issuer = createAuthWorker();
    const signIn = async (): Promise<Response> => {
      const requested = await issuer.fetch(signInRequest('alice@example.test'), h.env);
      expect(requested.status).toBe(202);
      return issuer.fetch(verifyRequest(lastLinkToken(h.sent)), h.env);
    };
    const first = await signIn();
    expect(first.status).toBe(204);
    const cookie = cookiePair(first);
    const subject = decodeJwt(cookie.split('=')[1]).sub;
    expect(subject).toMatch(/^[0-9a-f-]{36}$/);
    expect(decodeJwt(cookiePair(await signIn()).split('=')[1]).sub).toBe(subject);

    const exported = await issuer.fetch(mutation('/account', { headers: { cookie } }), h.env);
    expect(exported.status).toBe(200);
    expect(await exported.json()).toMatchObject({ email: 'alice@example.test', id: subject });

    const publisher = '0f8fad5b-d9cb-469f-a165-70867728950e';
    const erased = await issuer.fetch(
      mutation('/account', {
        headers: { cookie, [ACCOUNT_HEADER]: subject ?? '', 'x-archive-publisher': publisher },
        method: 'DELETE',
      }),
      h.env,
    );
    expect(erased.status).toBe(204);
    expect(erased.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(h.archiveCalls).toHaveLength(1);
    expect(h.archiveCalls[0].url).toBe(`${h.env.PUBLIC_ORIGIN}/api/v1/me/account`);
    expect(h.archiveCalls[0].headers.get('cookie')).toBe(cookie);
    expect(h.archiveCalls[0].headers.get('x-archive-publisher')).toBe(publisher);
    expect(h.db.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_users').get()).toEqual({ n: 0 });

    const reborn = await signIn();
    expect(reborn.status).toBe(204);
    const nextSubject = decodeJwt(cookiePair(reborn).split('=')[1]).sub;
    expect(nextSubject).toMatch(/^[0-9a-f-]{36}$/);
    expect(nextSubject).not.toBe(subject);
  });
});
