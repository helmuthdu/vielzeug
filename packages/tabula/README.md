# @vielzeug/tabula

> Typed CSV and TSV: RFC 4180 parser with schema-validated rows, streaming reader, and safe serializer.

## Installation

```sh
pnpm add @vielzeug/tabula
npm install @vielzeug/tabula
yarn add @vielzeug/tabula
```

## Quick Start

```ts
import { parseRecords, recordsToCsv } from '@vielzeug/tabula';

const rows = parseRecords('id,total\n7,"1,200.00"\n8,99.50\n');
// [{ id: '7', total: '1,200.00' }, { id: '8', total: '99.50' }]

console.log(recordsToCsv([{ a: 1, b: 'x,y' }]));
// a,b
// 1,"x,y"
```

No third-party runtime dependencies. One push-based scanner backs the string parser, the
`TransformStream` reader, and the schema-typed pipeline, so paste boxes, uploads, and
gigabyte exports parse with identical semantics. `parseTypedRecords` hands rows to any
Spell/standard-schema validator and aggregates every failure with its line number.

## Documentation

- [Overview](https://vielzeug.dev/tabula/)
- [Usage Guide](https://vielzeug.dev/tabula/usage)
- [API Reference](https://vielzeug.dev/tabula/api)
- [Examples](https://vielzeug.dev/tabula/examples)
- [Migration Guide](https://vielzeug.dev/tabula/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
