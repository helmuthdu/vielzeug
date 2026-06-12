export const stringValidationExample = {
  code: `// Reuse one stateful regex safely across repeated parses in the browser REPL.
import { s } from '@vielzeug/spell'

const HexColor = s.string().regex(/#[0-9a-f]{6}/gy)

for (const value of ['#ff8800', '#ff8800', 'oops']) {
  const result = HexColor.safeParse(value)
  console.log(value, '=>', result.success)
}`,
  name: 'String Validation',
};
