export const errorsBasicExample = {
  code: `import { CoinsError, USD, money } from '@vielzeug/coins'

try {
  money(1999n, USD)
} catch (error) {
  if (error instanceof CoinsError) {
    console.log(error.code)
    console.log(error.message)
  }
}`,
  name: 'Errors - Stable codes',
};
