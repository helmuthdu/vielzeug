# Change Log - @vielzeug/pulse

This log was last generated on Sat, 24 Oct 2026 19:56:28 GMT and should not be manually modified.

## 26.10.19
Sat, 24 Oct 2026 19:56:28 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.18
Fri, 23 Oct 2026 14:23:06 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
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

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.14
Sun, 18 Oct 2026 09:46:30 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
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

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.9
Wed, 14 Oct 2026 21:26:14 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.8
Tue, 13 Oct 2026 07:49:18 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.7
Mon, 12 Oct 2026 20:24:11 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.6
Mon, 12 Oct 2026 18:44:06 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.5
Thu, 08 Oct 2026 07:48:38 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.1
Wed, 07 Oct 2026 07:25:55 GMT

### Patches

- Standardize package text punctuation
## 26.10.0
Fri, 02 Oct 2026 18:01:51 GMT

### Minor changes

- feat: ExternalStore replaced by shared Subscribable type
- Add /testing MockWebSocket and autoOpen option for deterministic channel tests
## 3.0.0
Wed, 09 Sep 2026 22:15:14 GMT

### Breaking changes

- Replace Ripple-shaped readables with framework-neutral external stores.

## 2.4.0
Sun, 30 Aug 2026 13:16:08 GMT

### Minor changes

- refactor: remove combineSignals from public API. Use deriveAbortController instead.

## 2.3.0
Wed, 26 Aug 2026 17:29:55 GMT

### Minor changes

- feat: remove static is() type guard from base error class; add sideEffects: false for tree-shaking.
- feat: replace debug factories, logger options, and onError callbacks with unified tap() observability pattern.

## 2.2.2
Fri, 21 Aug 2026 16:02:58 GMT

### Patches

- fix: resolve TypeScript type errors in test files

## 2.2.1
Wed, 19 Aug 2026 06:57:36 GMT

_Version update only_

## 2.2.0
Mon, 17 Aug 2026 10:42:29 GMT

### Minor changes

- refactor: unify room/presence API under single schema generic. Replace four createPulse generics (TServer, TClient, TChannels, TPresence) with one PulseSchema type declaring server, client, channels, and rooms. Remove pulse.join(), pulse.leave(), and channel.presence; replace with pulse.room(name) returning a ref-counted RoomScope. When the room definition includes presence, the scope exposes reactive presence state (presence, updatePresence, onJoin, onLeave); otherwise it is a plain RoomScopeBase. Extract room/presence logic into RoomRegistry (new room.ts module; presence.ts deleted). Add PulseRoomTimeoutError for room join timeouts. Fix onOpen errors during session restore being swallowed; add transportClosed guard preventing double-reset on disconnect. dispose() now rejects pending room joins with PulseDisposedError before transport close. Simplify protocol.ts type guards. Update tests, docs, REPL examples, and demos (kanban, eshop) to the new API.

## 2.1.3
Sun, 16 Aug 2026 09:15:40 GMT

_Version update only_

## 2.1.2
Sat, 15 Aug 2026 06:26:02 GMT

_Version update only_

## 2.1.1
Mon, 10 Aug 2026 21:21:35 GMT

_Version update only_

## 2.1.0
Mon, 10 Aug 2026 15:11:23 GMT

### Minor changes

- feat: WebSocket lifecycle around explicit connection readiness and schema-bound scopes

## 2.0.1
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 2.0.0
Wed, 05 Aug 2026 16:48:52 GMT

### Breaking changes

- refactor!: align reactive channel state with Ripple signals

## 1.0.8
Sun, 26 Jul 2026 06:43:54 GMT

### Patches

- refactor(pulse): derive vite external list from package.json via readWorkspaceDeps() instead of hand-listing dependencies

## 1.0.7
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.0.6
Fri, 17 Jul 2026 14:17:07 GMT

### Patches

- fix: resolve ripple from source in tests and externalize bundle dep
- feat: harden frame handling and memoize presence channels

## 1.0.5
Tue, 14 Jul 2026 06:12:09 GMT

### Patches

- fix: rewrite workspace:* deps to real semver on publish (was shipping literal 'workspace:*' to npm, breaking installs outside this monorepo)

## 1.0.4
Tue, 07 Jul 2026 09:20:39 GMT

### Patches

- chore: declare minimum supported Node.js version (>=18) in package.json engines

## 1.0.3
Sun, 05 Jul 2026 06:22:27 GMT

_Version update only_

## 1.0.2
Sun, 05 Jul 2026 05:52:18 GMT

### Patches

- fix(pulse): correct channel/presence disposal-signal race, warn on silent drops, remove dead code

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(pulse): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

