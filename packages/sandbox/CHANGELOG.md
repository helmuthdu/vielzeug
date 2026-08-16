# Change Log - @vielzeug/sandbox

This log was last generated on Sun, 16 Aug 2026 09:15:40 GMT and should not be manually modified.

## 2.1.0
Sun, 16 Aug 2026 09:15:40 GMT

### Minor changes

- refactor: remove SandboxError.is() static type guard (use instanceof SandboxError); delete _sandbox.ts re-export hub and move buildCsp to _policy.ts; inline buildRuntimeDocument wrapper into buildDocumentFromOptions; sort SandboxMessage union members alphabetically to remove eslint-disable suppressions

## 2.0.0
Mon, 10 Aug 2026 15:11:23 GMT

### Breaking changes

- feat!: harden sandbox protocol and rename patch to replaceBody

## 1.2.3
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 1.2.2
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.2.1
Tue, 07 Jul 2026 09:20:39 GMT

### Patches

- chore: declare minimum supported Node.js version (>=18) in package.json engines

## 1.2.0
Fri, 03 Jul 2026 06:00:47 GMT

### Minor changes

- Add SandboxBridge.onState() subscription API, SandboxStateUpdateDetail type, and harden bridge messages against superseded-document races via a render generation tag
- render() now rejects with SandboxTimeoutError if no 'ready' signal arrives within 5s, in all builds (previously a dev-only warning that never rejected). Superseded renders and dispose() still resolve, not reject.

### Patches

- chore(sandbox): rename internal _warn.ts to _dev.ts

## 1.1.0
Thu, 02 Jul 2026 06:05:59 GMT

### Minor changes

- Add setStateAll batch API, lang/title document options, SandboxError base class, and harden CSP/postMessage security

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

