export const serializeBasicExample = {
  code: `import { detectDelimiter, toCsv } from '@vielzeug/tabula'

console.log(detectDelimiter('a\\tb\\tc\\n1\\t2\\t3'))

const csv = toCsv([['note', 'value'], ['said "hi"', 'a,b'], ['plain', 42]], { newline: '\\n' })
console.log(csv)`,
  name: 'Serialize - Safe quoting and detection',
};
