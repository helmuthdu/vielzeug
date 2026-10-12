# Change Log - @vielzeug/archive

This log was last generated on Mon, 12 Oct 2026 20:24:11 GMT and should not be manually modified.

## 26.10.7
Mon, 12 Oct 2026 20:24:11 GMT

### Minor changes

- Greenfield contract simplification (breaking): entry pages are forward-only (ArchivePage.previous removed, cursors minted against full query context), ArchiveDerivationStage drops 'response', /auth no longer re-exports OPERATOR_SESSION_MAX_AGE_SECONDS; publish-retry resolution shared between pre-read and post-insert paths.
## 26.10.6
Mon, 12 Oct 2026 18:44:06 GMT

### Minor changes

- Add Archive community publishing for Workers and D1, with typed collections, moderation, passwordless identity, coordinated account export and erasure, account-wide session revocation, live issuer validation, readiness checks, canonical fresh-database schemas and deployment documentation.
