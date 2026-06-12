export const numberValidationExample = {
  code: `// Enforce money-like numeric constraints for a checkout amount.
import { s } from '@vielzeug/spell'

const CheckoutTotal = s.number().nonNegative().multipleOf(0.01).max(9999)

for (const value of [129.99, -4, 19.999, 15000]) {
  const result = CheckoutTotal.safeParse(value)
  console.log(value, '=>', result.success ? 'accepted' : result.error.issues[0].message)
}`,
  name: 'Number Validation',
};
