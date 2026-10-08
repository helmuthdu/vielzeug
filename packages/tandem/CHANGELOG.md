# Change Log - @vielzeug/tandem

This log was last generated on Thu, 08 Oct 2026 07:48:38 GMT and should not be manually modified.

## 26.10.5
Thu, 08 Oct 2026 07:48:38 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.3
Wed, 07 Oct 2026 11:33:21 GMT

### Minor changes

- Greenfield API hardening: changed()/flush() throw TandemDisposedError after dispose, warning events carry the original error, SyncGateway.records() may be async, SyncDeletion.deletedAt is optional, state is cloned across the gateway seam, and revs are pruned on deletion
## 26.10.1
Wed, 07 Oct 2026 07:25:55 GMT

### Patches

- Standardize package text punctuation
## 26.10.0
Fri, 02 Oct 2026 18:01:51 GMT

### Minor changes

- feat(tandem): add offline-first sync engine with rev baselines, tombstoned deletions, and idle-batched pushes
