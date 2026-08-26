# Change Log - @vielzeug/necromancer

This log was last generated on Wed, 26 Aug 2026 17:29:55 GMT and should not be manually modified.

## 2.1.0
Wed, 26 Aug 2026 17:29:55 GMT

### Minor changes

- feat: remove static is() type guard from base error class; add sideEffects: false for tree-shaking.

## 2.0.2
Fri, 21 Aug 2026 16:02:58 GMT

### Patches

- fix: resolve TypeScript type errors in test files

## 2.0.1
Sun, 16 Aug 2026 09:15:39 GMT

_Version update only_

## 2.0.0
Mon, 10 Aug 2026 15:11:23 GMT

### Breaking changes

- feat(necromancer)!: add lifecycle-owned Web Animations API primitives with per-handle group results and additive FLIP; short-lived handles/groups expose dispose()/disposed only, no disposalSignal; captureLayout() also compensates size changes via additive scale, not just position; Keyframes accepts readonly arrays; adds @vielzeug/necromancer/testing (installFakeAnimations/FakeAnimation/createRect)

