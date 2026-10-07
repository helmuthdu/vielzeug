# Change Log - @vielzeug/tavern

This log was last generated on Wed, 07 Oct 2026 11:33:21 GMT and should not be manually modified.

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
