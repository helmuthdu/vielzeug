import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_HEADER,
  ARCHIVE_CONTRACT_VERSION,
  ARCHIVE_ERROR_CODES,
  ARCHIVE_LIMITS,
  ARCHIVE_SCHEMA_VERSION,
  archiveAccountSchema,
  archiveAliasSchema,
  archiveCollectionMetaSchema,
  archiveErrorResponseSchema,
  archiveHealthSchema,
  archiveOkSchema,
  archiveReportsSchema,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_PATH,
  sessionCookieValue,
} from '../contract';
import {
  type ArchiveAccount,
  ACCOUNT_HEADER as publicAccountHeader,
  archiveAccountSchema as publicAccountSchema,
} from '../index';

it('exports the account erasure precondition in the browser-safe root', () => {
  expect(ACCOUNT_HEADER).toBe('X-Archive-Account');
  expect(publicAccountHeader).toBe(ACCOUNT_HEADER);
  expect(ARCHIVE_ERROR_CODES).toContain('account-changed');
});

describe('archiveAccountSchema', () => {
  const account: ArchiveAccount = {
    createdAt: '2026-10-12T10:00:00.000Z',
    email: 'player@example.test',
    id: '0f8fad5b-d9cb-469f-a165-70867728950e',
    lastSignInAt: null,
  };

  it('exports the issuer metadata schema and accepts nullable last sign-in stamps', () => {
    expect(publicAccountSchema).toBe(archiveAccountSchema);
    expect(archiveAccountSchema.parse(account)).toEqual(account);
    expect(archiveAccountSchema.safeParse({ ...account, lastSignInAt: account.createdAt }).success).toBe(true);
  });

  it.each([
    { createdAt: 'not-a-timestamp' },
    { email: 'not-an-email' },
    { id: 'not-a-uuid' },
    { lastSignInAt: 'not-a-timestamp' },
    { token: 'private-token' },
  ])('rejects malformed metadata or private fields %j', (patch) => {
    expect(archiveAccountSchema.safeParse({ ...account, ...patch }).success).toBe(false);
  });
});

describe('archiveAliasSchema', () => {
  it('trims surrounding whitespace before validating', () => {
    const parsed = archiveAliasSchema.safeParse('  hunter  ');
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toBe('hunter');
  });

  it('rejects control characters', () => {
    expect(archiveAliasSchema.safeParse('hunt\u0000er').success).toBe(false);
    expect(archiveAliasSchema.safeParse('hunt\u007fer').success).toBe(false);
  });

  it('rejects lone surrogates but keeps valid emoji', () => {
    expect(archiveAliasSchema.safeParse('hunt\ud800er').success).toBe(false);
    expect(archiveAliasSchema.safeParse('hunt\ud83d\ude00er').success).toBe(true);
  });

  it('rejects aliases longer than 24 characters after trimming', () => {
    expect(archiveAliasSchema.safeParse('a'.repeat(25)).success).toBe(false);
    expect(archiveAliasSchema.safeParse(`  ${'a'.repeat(24)}  `).success).toBe(true);
  });
});

describe('archiveHealthSchema', () => {
  const health = (dbSchemaVersion: number, status: 'ok' | 'degraded' = 'ok') => ({
    dbSchemaVersion,
    features: { likes: true, publishing: true },
    limits: ARCHIVE_LIMITS,
    reason: status === 'ok' ? null : 'schema-mismatch',
    schemaVersion: ARCHIVE_CONTRACT_VERSION,
    status,
  });

  it('accepts the real healthy payload', () => {
    const parsed = archiveHealthSchema.safeParse(health(ARCHIVE_SCHEMA_VERSION));
    expect(parsed.success).toBe(true);
  });

  it('accepts the degraded payload a stale database answers with', () => {
    const parsed = archiveHealthSchema.safeParse(health(0, 'degraded'));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe('degraded');
      expect(parsed.data.dbSchemaVersion).toBe(0);
    }
  });

  it('advertises page bounds without pretending exports have a total bound', () => {
    const parsed = archiveHealthSchema.safeParse(health(ARCHIVE_SCHEMA_VERSION));
    expect(parsed.success && parsed.data.limits.maxPageSize).toBe(50);
  });

  it('rejects extra keys and a missing storage schema version', () => {
    expect(archiveHealthSchema.safeParse({ ...health(ARCHIVE_SCHEMA_VERSION), extra: true }).success).toBe(false);
    const { dbSchemaVersion, ...withoutVersion } = health(ARCHIVE_SCHEMA_VERSION);
    expect(archiveHealthSchema.safeParse(withoutVersion).success).toBe(false);
    void dbSchemaVersion;
  });

  it('rejects a wrong wire-contract version', () => {
    const parsed = archiveHealthSchema.safeParse({
      ...health(ARCHIVE_SCHEMA_VERSION),
      schemaVersion: ARCHIVE_CONTRACT_VERSION + 1,
    });
    expect(parsed.success).toBe(false);
  });
});

describe('archiveOkSchema', () => {
  it('accepts exactly the sign-out acknowledgement and rejects look-alikes', () => {
    expect(archiveOkSchema.safeParse({ ok: true }).success).toBe(true);
    expect(archiveOkSchema.safeParse({ ok: false }).success).toBe(false);
    expect(archiveOkSchema.safeParse({ ok: true, requestId: crypto.randomUUID() }).success).toBe(false);
  });
});

describe('archiveCollectionMetaSchema', () => {
  it('accepts a sorted vocabulary self-description and rejects foreign shapes', () => {
    const meta = { filters: ['even', 'odd'], name: 'fixture', tags: ['high', 'low'] };
    expect(archiveCollectionMetaSchema.safeParse(meta).success).toBe(true);
    expect(archiveCollectionMetaSchema.safeParse({ ...meta, extra: 1 }).success).toBe(false);
    expect(archiveCollectionMetaSchema.safeParse({ ...meta, name: 'Not_Routable' }).success).toBe(false);
    expect(archiveCollectionMetaSchema.safeParse({ ...meta, filters: [''] }).success).toBe(false);
  });
});

describe('archiveReportsSchema', () => {
  const report = {
    createdAt: '2026-01-01T00:00:00.000Z',
    entryId: crypto.randomUUID(),
    entryTitle: 'fixture-4',
    id: crypto.randomUUID(),
    reason: 'Spam content.',
    reporter: { id: crypto.randomUUID(), name: 'Alice' },
    resolvedAt: null,
  };

  it('accepts one operator queue item and rejects foreign shapes', () => {
    expect(archiveReportsSchema.safeParse({ cursor: null, reports: [report] }).success).toBe(true);
    expect(archiveReportsSchema.safeParse({ cursor: null, reports: [{ ...report, reason: '' }] }).success).toBe(false);
    expect(archiveReportsSchema.safeParse({ cursor: null, reports: [{ ...report, hidden: true }] }).success).toBe(
      false,
    );
    expect(archiveReportsSchema.safeParse({ cursor: null, reports: [] }).success).toBe(true);
  });
});

describe('sessionCookieValue', () => {
  it('composes the minting cookie from the contract name, path and security attributes', () => {
    const minted = sessionCookieValue('a.token', { maxAgeSeconds: 2592000, secure: false });
    expect(minted).toBe(
      `${SESSION_COOKIE_NAME}=a.token; HttpOnly; SameSite=Strict; Path=${SESSION_COOKIE_PATH}; Max-Age=2592000`,
    );
  });

  it('appends Secure only when requested, as the production expiry and mint do', () => {
    expect(sessionCookieValue('t', { maxAgeSeconds: 1, secure: true })).toContain('; Secure');
    expect(sessionCookieValue('t', { maxAgeSeconds: 1, secure: false })).not.toContain('Secure');
  });

  it('clears the cookie with the empty value and a zero max age', () => {
    expect(sessionCookieValue('', { maxAgeSeconds: 0, secure: false })).toBe(
      `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=${SESSION_COOKIE_PATH}; Max-Age=0`,
    );
  });
});

describe('ARCHIVE_ERROR_CODES', () => {
  it('contains no duplicate codes', () => {
    expect(new Set(ARCHIVE_ERROR_CODES).size).toBe(ARCHIVE_ERROR_CODES.length);
  });
});

describe('archiveErrorResponseSchema', () => {
  it('accepts a real error envelope and keeps the code typed', () => {
    const parsed = archiveErrorResponseSchema.safeParse({
      error: { code: 'not-found', message: 'No such entry.', requestId: crypto.randomUUID() },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.error.code).toBe('not-found');
  });

  it('accepts every code in the vocabulary', () => {
    for (const code of ARCHIVE_ERROR_CODES) {
      const parsed = archiveErrorResponseSchema.safeParse({
        error: { code, message: 'No such entry.', requestId: crypto.randomUUID() },
      });
      expect(parsed.success, code).toBe(true);
    }
  });

  it('rejects an unknown code as not an archive error at all', () => {
    expect(
      archiveErrorResponseSchema.safeParse({
        error: { code: 'definitely-not-ours', message: 'x', requestId: crypto.randomUUID() },
      }).success,
    ).toBe(false);
  });

  it('rejects extra keys, an empty message and a malformed requestId', () => {
    const base = { code: 'gone' as const, message: 'No such entry.', requestId: crypto.randomUUID() };
    expect(archiveErrorResponseSchema.safeParse({ error: { ...base, injected: true } }).success).toBe(false);
    expect(archiveErrorResponseSchema.safeParse({ error: { ...base, message: '' } }).success).toBe(false);
    expect(archiveErrorResponseSchema.safeParse({ error: { ...base, requestId: 'not-a-uuid' } }).success).toBe(false);
  });
});

describe('ARCHIVE_LIMITS', () => {
  it('advertises the derive-enforced bounds the migration also checks', () => {
    expect(ARCHIVE_LIMITS.tagsPerEntry).toBe(16);
    expect(ARCHIVE_LIMITS.vocabChars).toBe(64);
    expect(ARCHIVE_LIMITS.reportReasonChars).toBe(256);
    expect(ARCHIVE_LIMITS.maxPageSize).toBe(50);
  });
});
