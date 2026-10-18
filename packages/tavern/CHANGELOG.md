# Change Log - @vielzeug/tavern

This log was last generated on Sun, 18 Oct 2026 09:46:30 GMT and should not be manually modified.

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
