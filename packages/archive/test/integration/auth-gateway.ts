import { type AuthWorkerEnv, createAuthWorker, type SendEmail } from '../../src/auth';

/**
 * The auth-smoke gateway: the package's real `createAuthWorker` on one public origin,
 * with every non-auth path forwarded to the catalog Worker through the same
 * `AUTH_ARCHIVE` service binding account erasure uses — the single-origin layout
 * a deployment serves. Test-only and never bundled into the package.
 *
 * Email capture is the only substitution: `AUTH_EMAIL` becomes a sender that posts
 * each message to the suite's loopback mail sink instead of a provider. No route is
 * added to the issuer, and nothing here logs a message body.
 */
interface GatewayEnv extends Omit<AuthWorkerEnv, 'AUTH_EMAIL'> {
  /** The suite's loopback capture endpoint for outgoing sign-in emails. */
  SMOKE_MAIL_SINK: string;
}

const LOOPBACK_SINK = /^http:\/\/127\.0\.0\.1:\d{2,5}\/mail$/;

const captureSender = (sink: string): SendEmail => ({
  async send(message) {
    if (!LOOPBACK_SINK.test(sink)) throw new Error('The smoke mail sink must be a loopback /mail URL.');
    const response = await fetch(sink, {
      body: JSON.stringify(message),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    if (response.status !== 204) throw new Error('The smoke mail sink rejected the message.');
  },
});

// One wrapped bindings object per runtime env: the issuer caches its validated
// configuration per bindings object, so a fresh wrapper per request would re-import keys.
const wrapped = new WeakMap<GatewayEnv, AuthWorkerEnv>();
const authEnv = (env: GatewayEnv): AuthWorkerEnv => {
  let next = wrapped.get(env);
  if (next === undefined) {
    next = { ...env, AUTH_EMAIL: captureSender(env.SMOKE_MAIL_SINK) };
    wrapped.set(env, next);
  }
  return next;
};

const auth = createAuthWorker();
// Request events carry route, status and code only: no tokens, emails or subjects.
auth.tap((event) => console.log(JSON.stringify(event)));

export default {
  fetch(request: Request, env: GatewayEnv): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/v1/auth/')) return auth.fetch(request, authEnv(env));
    return env.AUTH_ARCHIVE.fetch(request);
  },
};
