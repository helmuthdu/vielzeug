---
title: 'Archive Examples: Client Error Mapping'
description: "Turn every Worker failure into an actionable UI decision from the validated error envelope."
---

## Client Error Mapping

### Problem

A browser client must react to failures with the right recovery: retry an unreachable
archive, wait out a rate limit, drop a removed entry, and refuse a bad payload —
without ever showing a raw error body to the user.

### Solution

Parse the Worker's one error envelope with the package's shared
`archiveErrorResponseSchema` and map the validated `code` to a typed client reason.
Only a *validated* envelope carries meaning: a hosting-layer 404 or a foreign body is
unavailability, never "gone" or "invalid" by status alone. The 429 carries
`Retry-After` seconds; surface that number instead of a generic failure.

```ts
import { archiveErrorResponseSchema, type ArchiveErrorCode } from '@vielzeug/archive';

type Reason =
  | 'account-change'
  | 'authentication-unavailable'
  | 'gone'
  | 'invalid'
  | 'rate-limited'
  | 'signed-out'
  | 'unavailable';

interface ClientFailure {
  reason: Reason;
  retryAfterSeconds: number | null;
}

/** The validated envelope or null: a foreign/malformed body carries no meaning. */
const failureFrom = async (response: Response): Promise<ClientFailure> => {
  const body: unknown = await response.json().catch(() => null);
  const parsed = archiveErrorResponseSchema.safeParse(body);
  if (!parsed.success) return { reason: 'unavailable', retryAfterSeconds: null };
  const code = parsed.data.error.code;
  if (code === 'account-changed' || code === 'publisher-changed')
    return { reason: 'account-change', retryAfterSeconds: null };
  if (code === 'unauthenticated') return { reason: 'signed-out', retryAfterSeconds: null };
  if (code === 'auth-unavailable')
    return { reason: 'authentication-unavailable', retryAfterSeconds: null };
  if (code === 'gone' || code === 'not-found') return { reason: 'gone', retryAfterSeconds: null };
  if (code === 'rate-limited') {
    const raw = response.headers.get('retry-after');
    const seconds = raw === null ? NaN : Number(raw);
    return { reason: 'rate-limited', retryAfterSeconds: Number.isFinite(seconds) && seconds > 0 ? seconds : null };
  }
  if (code === 'bad-request' || code === 'invalid-payload' || code === 'too-large' || code === 'unsupported-media') {
    return { reason: 'invalid', retryAfterSeconds: null };
  }
  return { reason: 'unavailable', retryAfterSeconds: null };
};

async function archiveFetch(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (!response.ok) throw await failureFrom(response);
  return response;
}
```

#### With exhaustive drift checking

Type the mapping as `Record<ArchiveErrorCode, Reason | 'ignore'>` and assign every
code: the compiler then fails whenever the Worker adds one, so client and server grow
together instead of drifting.

### Pitfalls

- Trusting status codes alone: a proxy's 404 HTML page is unavailability; only the
  envelope's `not-found`/`gone` codes mean a missing entry.
- Hand-rolling the envelope parser: `archiveErrorResponseSchema` already rejects an
  unknown `code`, a missing `requestId` and injected fields — reuse it instead of
  re-implementing the shape.
- Discarding `Retry-After`: the rate-limit UX should count the seconds the server
  actually sent.
- Treating `auth-unavailable` as `unauthenticated`: retry an issuer outage instead
  of clearing the user's signed-in state.
- Retrying `account-change` with new identity guards automatically: refresh the
  displayed account and ask for confirmation again before preparing another mutation.

### Related

- [Archive API Reference](../api.md) — the error vocabulary and the envelope shape.
- [Stand Up a Content Archive](./stand-up-a-content-archive.md) — the backend this client talks to.
