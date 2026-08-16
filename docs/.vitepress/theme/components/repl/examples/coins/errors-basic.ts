export const errorsBasicExample = {
  code: `import { CoinsError, USD, money } from '@vielzeug/coins'

try {
  money('19.999', USD)
} catch (error) {
  if (error instanceof CoinsError) {
    console.log(error.code)
    console.log(error.message)
  }
}`,
  name: 'Errors - Stable codes',
};
