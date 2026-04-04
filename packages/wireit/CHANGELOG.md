# Change Log - @vielzeug/wireit

This log was last generated on Sat, 04 Apr 2026 13:30:02 GMT and should not be manually modified.

## 2.1.0
Sat, 04 Apr 2026 13:30:02 GMT

### Minor changes

- General Improvements and Bugfixes

## 2.0.0
Tue, 24 Mar 2026 22:12:47 GMT

### Breaking changes

- Major release: zero-dependency IoC container with typed tokens via createToken<T>(description); three registration styles — value(), factory(), and bind() — plus low-level register(); singleton, transient, and scoped lifetimes; async provider support with getAsync() / getAllAsync() and concurrent singleton deduplication; per-provider dispose hooks called on container.dispose(); child containers via createChild() with scoped lifetime isolation; runInScope() for auto-disposed request scopes; alias() for interface-to-implementation mapping with cycle detection; batch resolution via getAll() / getAllAsync() with typed tuple returns; getOptional() / getOptionalAsync() for safe resolution; mock(), snapshot(), restore() test helpers; createTestContainer() returning { container, dispose }; debug() for full hierarchy introspection; [Symbol.asyncDispose] support

## 1.1.1
Thu, 12 Feb 2026 11:34:04 GMT

### Patches

- new wireit lib

