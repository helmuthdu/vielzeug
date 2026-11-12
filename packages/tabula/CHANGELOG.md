# Change Log - @vielzeug/tabula

This log was last generated on Thu, 12 Nov 2026 20:00:45 GMT and should not be manually modified.

## 26.11.14

Thu, 12 Nov 2026 20:00:45 GMT

### Major changes

- Remove `detectDelimiter`, `parseRecordsWithLines`, and `LineRow` from the public surface; `CsvScanner` now takes the shared options object and owns chunk buffering with lazy delimiter auto-detection (`createCsvGridStream` is a thin adapter); single-character delimiters are enforced with `TabulaParseError`; async schemas in `parseTypedRecords` now raise `TabulaParseError`.
## 26.11.13

Thu, 12 Nov 2026 15:13:50 GMT

### Minor changes

- feat(tabula): initial release — RFC 4180 CSV/TSV parser with streaming reader, spell-typed rows, and safe serializer
