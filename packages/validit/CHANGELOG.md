# Change Log - @vielzeug/validit

This log was last generated on Tue, 24 Mar 2026 22:12:47 GMT and should not be manually modified.

## 2.0.0
Tue, 24 Mar 2026 22:12:47 GMT

### Breaking changes

- Major release: schema-first validation with full TypeScript type inference via v factory; primitives (string, number, boolean, date, null, undefined, unknown, never, any) with chainable refinements (min, max, email, url, regex, and more); complex types (object with strict/partial/pick/omit, array, tuple, record, union, intersect, variant discriminated unions, enum, nativeEnum, literal, instanceof); modifiers (optional, nullable, nullish); coerce namespace for type-coercing schemas; lazy() for recursive schemas; ValidationError with path-aware issues, flatten(), and static is() guard; zero dependencies

## 1.1.3
Sun, 15 Feb 2026 21:52:44 GMT

### Patches

- code cleanup and improvements

## 1.1.2
Fri, 13 Feb 2026 09:03:42 GMT

### Patches

- add UUID validation method to StringSchema

## 1.1.1
Thu, 12 Feb 2026 17:52:26 GMT

### Patches

- code cleanup

## 1.1.0
Tue, 10 Feb 2026 22:53:08 GMT

### Minor changes

- Release version 1.1.0 (minor bump from 1.0.0)

