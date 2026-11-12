export const parseBasicExample = {
  code: `import { parseGrid, parseRecords, recordsToCsv } from '@vielzeug/tabula'

const rows = parseGrid('name;qty\\n"drill, big";3\\nhammer;1\\n')
console.log(JSON.stringify(rows))

const records = parseRecords('id,total\\n7,"1,200.00"\\n8,99.50\\n')
console.log(JSON.stringify(records))

console.log(recordsToCsv([{ a: 1, b: 'x,y' }], { newline: '\\n' }))`,
  name: 'Parse - Delimiters, quoting, records',
};
