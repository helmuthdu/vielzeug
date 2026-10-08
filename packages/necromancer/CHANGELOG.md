# Change Log - @vielzeug/necromancer

This log was last generated on Thu, 08 Oct 2026 07:48:38 GMT and should not be manually modified.

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

- Export shouldReduceMotion for shared prefers-reduced-motion checks
## 3.0.0
Wed, 09 Sep 2026 22:15:14 GMT

### Breaking changes

- Remove implicit animation replacement and package-owned timing defaults, preserve element subtype inference, and make test animation fixtures disposable.

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

