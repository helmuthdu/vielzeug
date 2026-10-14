# Change Log - @vielzeug/archive

This log was last generated on Wed, 14 Oct 2026 21:26:14 GMT and should not be manually modified.

## 26.10.9
Wed, 14 Oct 2026 21:26:14 GMT

### Minor changes

- Fetch issuer signing keys through the required auth service binding so same-zone Cloudflare deployments can authenticate sessions.
## 26.10.8
Tue, 13 Oct 2026 07:49:18 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.7
Mon, 12 Oct 2026 20:24:11 GMT

### Minor changes

- Greenfield contract simplification (breaking): entry pages are forward-only (ArchivePage.previous removed, cursors minted against full query context), ArchiveDerivationStage drops 'response', /auth no longer re-exports OPERATOR_SESSION_MAX_AGE_SECONDS; publish-retry resolution shared between pre-read and post-insert paths.
## 26.10.6
Mon, 12 Oct 2026 18:44:06 GMT

### Minor changes

- Add Archive community publishing for Workers and D1, with typed collections, moderation, passwordless identity, coordinated account export and erasure, account-wide session revocation, live issuer validation, readiness checks, canonical fresh-database schemas and deployment documentation.
