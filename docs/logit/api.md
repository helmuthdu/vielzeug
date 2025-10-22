# Logit API Reference

This document describes the public API of the `@vielzeug/logit` package.

## Logit Methods

- `Logit.debug(...args)` – Debug log
- `Logit.info(...args)` – Info log
- `Logit.success(...args)` – Success log
- `Logit.warn(...args)` – Warning log
- `Logit.error(...args)` – Error log
- `Logit.trace(...args)` – Trace log
- `Logit.table(...args)` – Table output
- `Logit.time(label)` – Start timer
- `Logit.timeEnd(label)` – End timer
- `Logit.groupCollapsed(text, label?, time?)` – Start collapsed group
- `Logit.groupEnd()` – End group
- `Logit.assert(valid, message, context)` – Assert

## Configuration Methods

- `Logit.initialise(options)` – Set multiple options
- `Logit.setLogLevel(level)` – Set log level
- `Logit.setPrefix(namespace)` – Set namespace
- `Logit.setRemote(remote)` – Set remote handler
- `Logit.setRemoteLogLevel(level)` – Set remote log level
- `Logit.setVariant(variant)` – Set output variant
- `Logit.showEnvironment(value)` – Show/hide environment
- `Logit.showTimestamp(value)` – Show/hide timestamp

## Getters

- `Logit.getLevel()` – Get current log level
- `Logit.getPrefix()` – Get current namespace
- `Logit.getTimestamp()` – Get timestamp setting

## Types

- `LogitType`: Log level type
- `LogitLevel`: Log level or 'off'
- `LogitOptions`: Logit configuration
- `LogitRemoteOptions`: Remote handler config
- `LogitTheme`: Theme definition

See source for full type details.
