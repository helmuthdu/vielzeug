# Change Log - @vielzeug/archive

This log was last generated on Thu, 12 Nov 2026 15:13:50 GMT and should not be manually modified.

## 26.11.13

Thu, 12 Nov 2026 15:13:50 GMT

### Patches

- Share the server primitives in src/_server and drop the legacy error-prototype fixup.
## 26.11.12

Wed, 11 Nov 2026 21:47:10 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.11

Wed, 11 Nov 2026 18:02:30 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.10

Wed, 11 Nov 2026 13:20:56 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.9

Tue, 10 Nov 2026 21:47:05 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.8
Mon, 09 Nov 2026 05:44:57 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.7
Sun, 08 Nov 2026 08:30:51 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.6

Fri, 06 Nov 2026 13:25:51 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.5

Thu, 05 Nov 2026 21:44:45 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.4

Wed, 04 Nov 2026 16:49:50 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.3

Wed, 04 Nov 2026 05:52:43 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.2

Tue, 03 Nov 2026 18:42:43 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.1

Tue, 03 Nov 2026 17:00:37 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.0

Tue, 03 Nov 2026 16:30:26 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.22

Fri, 30 Oct 2026 19:07:28 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.21

Tue, 27 Oct 2026 08:39:39 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.20

Sun, 25 Oct 2026 05:13:02 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.19

Sat, 24 Oct 2026 19:56:28 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.18

Fri, 23 Oct 2026 14:23:06 GMT

### Patches

- docs(archive): state issuer edge rate-limit and cf-connecting-ip deployment responsibilities
## 26.10.17

Fri, 23 Oct 2026 07:29:16 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.16

Wed, 21 Oct 2026 07:30:45 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.15

Mon, 19 Oct 2026 10:13:34 GMT

### Minor changes

- Accept repeated filter and tag query parameters on entry listings; values OR-match within each key, deduped and order-independent for cursor contexts

### Patches

- Confirm sign-in page parses bare asctime Retry-After dates as GMT instead of local time
## 26.10.14

Sun, 18 Oct 2026 09:46:30 GMT

### Patches

- Extend operator sessions from 15 to 60 minutes while preserving ordinary session lifetimes and revocation.
## 26.10.13

Sat, 17 Oct 2026 06:46:08 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.12

Sat, 17 Oct 2026 05:06:33 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.11

Thu, 15 Oct 2026 13:45:48 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.10

Thu, 15 Oct 2026 05:00:39 GMT

### Minor changes

- feat: add nonce-protected paper-and-copper magic-link confirmation with accessible status, fixed /account recovery, bounded strict Retry-After parsing, non-blocking response-body cancellation and page-lifecycle cleanup; malformed GET links now return branded HTML 400 while guarded POST redemption and JSON errors stay unchanged
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
