export const exchangeBasicExample = {
  code: `import { EUR, USD, exchange, exchangeRate, format, money } from '@vielzeug/coins'

const usdToEur = exchangeRate({ from: USD, to: EUR, value: '0.9234' })
const euros = exchange(money('100.00', USD), usdToEur, { rounding: 'halfEven' })

console.log(format(euros, { locale: 'de-DE' }))`,
  name: 'exchange - Exact currency conversion',
};
