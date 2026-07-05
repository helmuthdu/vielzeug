# Change Log - @vielzeug/scout

This log was last generated on Sun, 05 Jul 2026 06:22:27 GMT and should not be manually modified.

## 1.1.1
Sun, 05 Jul 2026 06:22:27 GMT

_Version update only_

## 1.1.0
Sun, 05 Jul 2026 05:52:18 GMT

### Minor changes

- fix(scout): tokenize() now preserves non-ASCII text (CJK/Cyrillic were unsearchable), reactive results now update on index.add()/remove()/reindex() via new ScoutIndex.onMutate(), createIndex() throws ScoutIndexError on zero fields, SearchState.clear() throws ScoutDisposedError after dispose(), punctuation-only queries return no results instead of matching everything; adds segmentWords() and devtools debugSearch()

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(scout): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

