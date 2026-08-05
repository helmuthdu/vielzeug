export const serializationBasicExample = {
  code: `import { USD, money, parseMoneyJSON, toJSON } from '@vielzeug/coins'

const encoded = toJSON(money('19.99', USD))
const restored = parseMoneyJSON(encoded)

console.log(encoded)
console.log(restored.amount, restored.currency.code)`,
  name: 'Serialization - Validate JSON boundaries',
};
