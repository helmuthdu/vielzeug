export const allocationBasicExample = {
  code: `// Distribute money across shares — no minor unit is ever lost or gained
import { allocate, clamp, money, splitEvenly, toDecimal } from '@vielzeug/coins'

// Equal split: $10.00 into 3 shares
const [a, b, c] = allocate(money('10.00', 'USD'), [1, 1, 1])
console.log('Equal 3-way split:')
console.log(' ', toDecimal(a), toDecimal(b), toDecimal(c))
// '3.34'  '3.33'  '3.33'
// Sum is always exact:
console.log(' sum:', a.amount + b.amount + c.amount, '=', money('10.00', 'USD').amount)

// Weighted 30/70 split
const [fee, merchant] = allocate(money('10.00', 'USD'), [3, 7])
console.log('\\n30/70 split:')
console.log(' fee:', toDecimal(fee), '  merchant:', toDecimal(merchant))
// '3.00'  '7.00'

// Decimal string weights — lossless
const shares = allocate(money('7.00', 'USD'), ['0.333', '0.333', '0.334'])
console.log('\\nDecimal weights:')
shares.forEach((s, i) => console.log(' share', i, ':', toDecimal(s)))
// '2.33'  '2.33'  '2.34'

// splitEvenly — sugar over allocate
const [x, y, z] = splitEvenly(money('9.00', 'USD'), 3)
console.log('\\nsplitEvenly 3 × $3.00:', toDecimal(x), toDecimal(y), toDecimal(z))

// clamp — enforce a price range
const lo = money('1.00', 'USD')
const hi = money('99.99', 'USD')
console.log('\\nclamp $0.50  →', toDecimal(clamp(money('0.50',   'USD'), lo, hi)))  // '1.00'
console.log('clamp $42.00 →', toDecimal(clamp(money('42.00',  'USD'), lo, hi)))  // '42.00'
console.log('clamp $150   →', toDecimal(clamp(money('150.00', 'USD'), lo, hi)))  // '99.99'`,
  name: 'Allocation without losing minor units',
};
