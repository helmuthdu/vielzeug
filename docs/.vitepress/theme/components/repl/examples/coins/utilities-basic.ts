export const utilitiesBasicExample = {
  code: `import { currency, isCurrency, isMoney, money } from '@vielzeug/coins'

const points = currency({ code: 'PTS', minorUnit: 0 })
const balance = money('250', points)

console.log(currency('USD').minorUnit)
console.log(isCurrency(points))
console.log(isMoney(balance))`,
  name: 'Currency definitions and validation',
};
