export const serializeBasicExample = {
  code: `import { toCsv } from '@vielzeug/tabula'

const csv = toCsv([['note', 'value'], ['said "hi"', 'a,b'], ['plain', 42]], { newline: '\\n' })
console.log(csv)

const tsv = toCsv([['note', 'value'], ['tab\\there', 42]], { delimiter: '\\t', newline: '\\n' })
console.log(tsv)`,
  name: 'Serialize - Safe quoting and delimiters',
};
