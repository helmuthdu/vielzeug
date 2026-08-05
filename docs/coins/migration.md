---
title: Coins 2.0 Migration
---

# Coins 2.0 Migration

Coins 2.0 redesigns exact-money and currency APIs.

## Rebuild money boundaries

Update value creation, parsing, arithmetic, formatting, serialization, and exchange integrations to use the 2.0 `money`, `parseMoney`, `decimal`, `format`, `toJSON`, `exchange`, and `exchangeRate` APIs.

## Use currency definitions

Replace ad-hoc currency data with the 2.0 currency helpers. Use built-in currencies where applicable, or define supported currencies with `defineCurrency`.

## Verify rounding and persistence

Recheck every rounding boundary, persisted money payload, and exchange calculation after migration. These are exact-value contracts and should not be converted through JavaScript floating-point numbers.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current money, currency, and serialization contracts.
