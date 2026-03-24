# Change Log - @vielzeug/eventit

This log was last generated on Tue, 24 Mar 2026 22:12:47 GMT and should not be manually modified.

## 2.0.0
Tue, 24 Mar 2026 22:12:47 GMT

### Breaking changes

- Major release: strongly-typed publish/subscribe event bus with full TypeScript event map inference; on/once/emit with typed payloads; AbortSignal integration on all subscription methods; promise-based wait() for one-time events; async generator events() for pull-based consumption; listenerCount per event or global; onEmit and onError lifecycle hooks; BusDisposedError for safe teardown; [Symbol.dispose]() support

