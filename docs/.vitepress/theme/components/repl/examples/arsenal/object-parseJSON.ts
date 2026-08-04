export const objectParseJSONExample = {
  code: `import { tryParseJson } from '@vielzeug/arsenal/object'

const valid = tryParseJson('{"id":1,"name":"Alice"}')
const invalid = tryParseJson('{')

if (valid.ok) console.log('Parsed:', valid.value)
if (!invalid.ok) console.log('Syntax error:', invalid.error.message)`,
  name: 'tryParseJson - Preserve JSON syntax errors',
};
