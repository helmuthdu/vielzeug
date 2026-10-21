# Change Log - @vielzeug/beacon

This log was last generated on Wed, 21 Oct 2026 07:30:45 GMT and should not be manually modified.

## 26.10.16
Wed, 21 Oct 2026 07:30:45 GMT

### Minor changes

- feat(beacon): initial release - createTour, createCoachmark, resolveTarget with persisted resumable progress; both handles publish a live `current` snapshot whose rect stays fresh on scroll and resize, so refine's ore-tour renders them through a single bind() call
