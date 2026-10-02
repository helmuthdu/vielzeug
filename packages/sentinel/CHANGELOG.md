# Change Log - @vielzeug/sentinel

This log was last generated on Fri, 02 Oct 2026 18:01:51 GMT and should not be manually modified.

## 26.10.0
Fri, 02 Oct 2026 18:01:51 GMT

### Minor changes

- feat: drop Readable alias in favour of Subscribable; add SentinelEvent
- feat: add createFullscreen
## 3.0.0
Wed, 09 Sep 2026 22:15:14 GMT

### Breaking changes

- Replace Ripple-backed signal reads with a zero-dependency, callback-safe getSnapshot external-store contract.

## 2.0.3
Sun, 30 Aug 2026 13:16:08 GMT

### Patches

- refactor: Sentinel<T> extends Disposable from ripple. Remove unreachable aborted-check dead code in SentinelHandle constructor. Rename internal signalFactory to toSignal.

## 2.0.2
Wed, 26 Aug 2026 17:29:55 GMT

### Patches

- chore: add sideEffects: false for tree-shaking.

## 2.0.1
Fri, 21 Aug 2026 16:02:58 GMT

_Initial release_

