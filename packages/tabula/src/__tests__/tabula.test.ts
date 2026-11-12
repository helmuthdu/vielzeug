import { s } from '@vielzeug/spell';
import { describe, expect, it } from 'vitest';
import { TabulaParseError } from '../errors';

import {
  createCsvGridStream,
  detectDelimiter,
  parseGrid,
  parseRecords,
  parseTypedRecords,
  recordsToCsv,
  TabulaValidationError,
  toCsv,
} from '../index';

describe('parseGrid', () => {
  it('parses plain, quoted, embedded-newline and escaped-quote cells', () => {
    const text = 'a,"b,c","say ""hi""",d\r\ne,"multi\nline",f,g\r\n';
    expect(parseGrid(text)).toEqual([
      ['a', 'b,c', 'say "hi"', 'd'],
      ['e', 'multi\nline', 'f', 'g'],
    ]);
  });

  it('handles BOM, lone CR lines, and blank-line skipping', () => {
    expect(parseGrid('\uFEFFa;b\rbc\rc\n\n\n')).toEqual([['a', 'b'], ['bc'], ['c']]);
    expect(parseGrid('a\n\nb\n', { skipEmptyLines: false })).toEqual([['a'], [''], ['b']]);
  });

  it('auto-detects semicolons and tabs, pinned delimiter wins', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(detectDelimiter('a\tb')).toBe('\t');
    expect(parseGrid('a;b\n1;2', { delimiter: ';' })).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
    expect(parseGrid('a;b;c', { delimiter: ',' })).toEqual([['a;b;c']]);
  });
});

describe('parseRecords', () => {
  it('uses the first row as headers by default', () => {
    expect(parseRecords('id,name\r\n1,Ada\r\n2,Grace\r\n')).toEqual([
      { id: '1', name: 'Ada' },
      { id: '2', name: 'Grace' },
    ]);
  });

  it('accepts explicit headers for headerless documents and truncates overflow', () => {
    expect(parseRecords('1,x,extra\n2,y', { headers: ['id', 'name'] })).toEqual([
      { id: '1', name: 'x' },
      { id: '2', name: 'y' },
    ]);
  });
});

describe('toCsv / recordsToCsv', () => {
  it('quotes only when required and doubles embedded quotes', () => {
    const text = toCsv([
      ['plain', 'has,comma', 'has"quote', 'has\nnewline', ' padded '],
      [null, undefined, 42, true, ''],
    ]);
    expect(text).toBe('plain,"has,comma","has""quote","has\nnewline"," padded "\r\n,,42,true,\r\n');
  });

  it('writes CRLF by default, custom delimiter and quoteAll on demand', () => {
    expect(toCsv([['a', 'b']], { delimiter: '\t', newline: '\n', quoteAll: true })).toBe('"a"\t"b"\n');
  });

  it('serializes records with stable columns', () => {
    const csv = recordsToCsv(
      [
        { a: 1, b: 2 },
        { a: 3, c: 4 },
      ],
      { columns: ['a', 'b', 'c'], newline: '\n' },
    );
    expect(csv).toBe('a,b,c\n1,2,\n3,,4\n');
  });
});

describe('createCsvGridStream', () => {
  it('reassembles rows across chunk boundaries and detects the delimiter', async () => {
    const stream = createCsvGridStream();
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    const collected: string[][] = [];
    const reading = (async () => {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        collected.push(value);
      }
    })();
    await writer.write('id;name\n1;Fe');
    await writer.write('lix\n2;Ada\n');
    await writer.close();
    await reading;
    expect(collected).toEqual([
      ['id', 'name'],
      ['1', 'Felix'],
      ['2', 'Ada'],
    ]);
  });
});

describe('parseTypedRecords', () => {
  const Order = s.object({
    id: s.string().min(1),
    shipped: s.coerce.boolean(),
    total: s.coerce.number().min(0),
  });

  it('coerces and validates every row', () => {
    const rows = parseTypedRecords('id,total,shipped\nA1,19.90,true\nA2,0,false\n', Order);
    expect(rows).toEqual([
      { id: 'A1', shipped: true, total: 19.9 },
      { id: 'A2', shipped: false, total: 0 },
    ]);
  });

  it('aggregates one row error per invalid line with 1-based line numbers', () => {
    const text = 'id,total,shipped\nA1,nope,true\nA2,5,true\nA3,-1,false\n';
    try {
      parseTypedRecords(text, Order);
      expect.unreachable('expected TabulaValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(TabulaValidationError);
      expect((error as TabulaValidationError).errors.map((rowError) => rowError.line)).toEqual([2, 4]);
    }
  });
});

describe('line numbers', () => {
  it('reports physical lines across quoted newlines and blank lines', () => {
    const text = 'id,name\n1,"multi\nline"\n\n2,bad\n';
    try {
      parseTypedRecords(text, {
        '~standard': {
          validate: (value: unknown) =>
            (value as Record<string, string>).name === 'bad'
              ? { issues: [{ message: 'nope' }] }
              : { value: value as Record<string, string> },
          vendor: 'test',
          version: 1,
        },
      } as never);
      expect.unreachable();
    } catch (error) {
      expect((error as TabulaValidationError).errors.map((rowError) => rowError.line)).toEqual([5]); // header 1, quoted record 2-3, blank 4, bad record 5
    }
  });
});

describe('parseRecords headers guard', () => {
  it('rejects an empty header list', () => {
    expect(() => parseRecords('a,b\n', { headers: [] })).toThrow(TabulaParseError);
  });
});
