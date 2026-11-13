# Change Log - @vielzeug/tavern

This log was last generated on Fri, 13 Nov 2026 19:37:26 GMT and should not be manually modified.

## 26.11.17

Fri, 13 Nov 2026 19:37:26 GMT

### Patches

- Survive transient ICE disconnects
## 26.11.16

Fri, 13 Nov 2026 06:00:21 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.15

Thu, 12 Nov 2026 23:04:49 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.14

Thu, 12 Nov 2026 20:00:45 GMT

### Minor changes

- New `@vielzeug/tavern/testing` subpath: `createFakeRtc()` and the `FakeRtc` type, so session tests pair a real host and guest through the fake WebRTC factory without depending on `@vielzeug/mesh` directly.
- Named sessions: `TavernSubject` gained an optional stable `id`, and `sendCommand` a third `target` argument. Declaring the id makes tavern verify every guest command against it before the command table runs, closing the gap where a command meant for another subject silently reached the hosted one.
## 26.11.13

Thu, 12 Nov 2026 15:13:50 GMT

### Major changes

- Redesign the session API around one subject per session: `subjectId` routing removed (sendCommand(name, args)), command table is a plain record with read-only sessions supported, notice seam split into host `serializeNotice` and guest `onNotice`, `onJoined`/`onFailed` replaced by an awaitable `ready` promise, pairing vocabulary renamed to codes, and both tap unions gained a `dispose` event.
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
## 26.10.3

Wed, 07 Oct 2026 11:33:21 GMT

### Minor changes

- Greenfield API pass: presence/warnings/rejections move from onX callbacks to tap() with TavernHostEvent/TavernGuestEvent, host gains a peers getter, post-dispose use throws TavernDisposedError, rejections carry commandId
## 26.10.1

Wed, 07 Oct 2026 07:25:55 GMT

### Patches

- Standardize package text punctuation
## 26.10.0

Fri, 02 Oct 2026 18:01:51 GMT

### Minor changes

- feat(tavern): initial release: host-owned session replication over mesh
- Host sessions are now observable end-to-end: onEnded fires exactly once on both handles (subject removal and explicit disposal), handles expose disposed/disposalSignal/Symbol.dispose per the disposal contract, every unusable pasted code rejects with cause-chained TavernPairingError (mesh errors no longer leak across the boundary), failed joins tear down their node, onFailed no longer double-fires, a throwing snapshot read routes through onWarning, and error classes follow the repo template with correct names

### Patches

- Pairing-code handling simplified: meshQrCodec owns the CompressionStream fallback, so tavern calls it directly instead of wrapping both codecs in try/catch
