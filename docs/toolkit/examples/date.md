# 📅 Date Utilities Examples

Date utilities help you work with dates and times in a type-safe, ergonomic way. Use these helpers for common operations
like checking expiration, calculating intervals, and finding time differences.

## 📚 Quick Reference

| Method   | Description                                 |
| -------- | ------------------------------------------- |
| expires  | Check if a date/time has expired            |
| interval | Calculate the interval between two dates    |
| timeDiff | Get a detailed difference between two dates |

## 🔗 Granular Examples

- [expires](./date/expires.md)
- [interval](./date/interval.md)
- [timeDiff](./date/timeDiff.md)

## 💡 Example Usage

```ts
import { interval, expires, timeDiff } from '@vielzeug/toolkit';

// Calculate days between two dates
interval('2025-01-01', '2025-01-10'); // 9

// Check if a timestamp is expired
expires(Date.now() - 1000); // true

// Get detailed time difference
const diff = timeDiff('2025-01-01', '2025-01-02'); // { days: 1, ... }
```

## 🔎 See Also

- [Array Utilities](./array.md)
- [Object Utilities](./object.md)
- [Math Utilities](./math.md)
