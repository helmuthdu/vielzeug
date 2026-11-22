# Change Log - @vielzeug/tabula

This log was last generated on Sun, 22 Nov 2026 21:23:30 GMT and should not be manually modified.

## 26.11.31

Sun, 22 Nov 2026 21:23:30 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.30

Sun, 22 Nov 2026 06:11:08 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.29

Sat, 21 Nov 2026 18:46:32 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.28

Fri, 20 Nov 2026 09:18:31 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.27

Thu, 19 Nov 2026 21:35:32 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.26

Thu, 19 Nov 2026 20:05:01 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.25

Thu, 19 Nov 2026 09:06:34 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.24

Wed, 18 Nov 2026 14:27:22 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.23

Wed, 18 Nov 2026 09:39:29 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.22

Tue, 17 Nov 2026 07:34:49 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.21

Mon, 16 Nov 2026 17:10:57 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.20

Mon, 16 Nov 2026 15:20:18 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.19

Sun, 15 Nov 2026 10:17:59 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.18

Sun, 15 Nov 2026 09:34:00 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.17

Fri, 13 Nov 2026 19:37:26 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.16

Fri, 13 Nov 2026 06:00:21 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.15

Thu, 12 Nov 2026 23:04:49 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.11.14

Thu, 12 Nov 2026 20:00:45 GMT

### Major changes

- Remove `detectDelimiter`, `parseRecordsWithLines`, and `LineRow` from the public surface; `CsvScanner` now takes the shared options object and owns chunk buffering with lazy delimiter auto-detection (`createCsvGridStream` is a thin adapter); single-character delimiters are enforced with `TabulaParseError`; async schemas in `parseTypedRecords` now raise `TabulaParseError`.
## 26.11.13

Thu, 12 Nov 2026 15:13:50 GMT

### Minor changes

- feat(tabula): initial release — RFC 4180 CSV/TSV parser with streaming reader, spell-typed rows, and safe serializer
