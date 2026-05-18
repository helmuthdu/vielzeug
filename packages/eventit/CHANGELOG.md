# Change Log - @vielzeug/eventit

This log was last generated on Mon, 18 May 2026 19:59:57 GMT and should not be manually modified.

## 3.0.4
Mon, 18 May 2026 19:59:57 GMT

### Patches

- update docs

## 3.0.3
Sun, 17 May 2026 06:08:37 GMT

### Patches

- Patch release after npm E409 conflict resolution.

## 3.0.2
Sun, 17 May 2026 05:54:57 GMT

### Patches

- Patch release after version normalization to major 3.

## 3.0.1
Sun, 17 May 2026 05:41:44 GMT

### Patches

- Dummy patch release to republish after npm token incident.

## 3.0.0
Sun, 17 May 2026 05:10:17 GMT

### Breaking changes

- Release a new major version with the v2.2 event-bus overhaul, improved typing and dispatch guarantees, and breaking API consistency fixes.

## 2.1.0
Sat, 04 Apr 2026 13:30:02 GMT

### Minor changes

- General Improvements and Bugfixes

## 2.0.0
Tue, 24 Mar 2026 22:12:47 GMT

### Breaking changes

- Major release: strongly-typed publish/subscribe event bus with full TypeScript event map inference; on/once/emit with typed payloads; AbortSignal integration on all subscription methods; promise-based wait() for one-time events; async generator events() for pull-based consumption; listenerCount per event or global; onEmit and onError lifecycle hooks; BusDisposedError for safe teardown; [Symbol.dispose]() support

