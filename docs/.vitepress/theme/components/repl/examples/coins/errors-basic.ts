export const errorsBasicExample = {
  code: `// Typed error classes for structured error handling
import { CurrencyMismatchError, InvalidCurrencyError, add, money } from '@vielzeug/coins'

// CurrencyMismatchError — thrown when currencies differ
try {
  add(money('10.00', 'USD'), money('10.00', 'EUR'))
} catch (e) {
  if (e instanceof CurrencyMismatchError) {
    console.log('Mismatch!', 'expected:', e.expected, 'received:', e.received)
    // expected: 'USD'  received: 'EUR'
  }
}

// CurrencyMismatchError extends TypeError
const mismatch = new CurrencyMismatchError('USD', 'EUR')
console.log('instanceof TypeError:', mismatch instanceof TypeError)  // true
console.log('instanceof CurrencyMismatchError:', mismatch instanceof CurrencyMismatchError)  // true
console.log('name:', mismatch.name)      // 'CurrencyMismatchError'
console.log('expected:', mismatch.expected)  // 'USD'
console.log('received:', mismatch.received)  // 'EUR'

// InvalidCurrencyError — thrown for unknown ISO 4217 codes
try {
  money('1.00', 'FAKE')
} catch (e) {
  if (e instanceof InvalidCurrencyError) {
    console.log('Invalid currency:', e.code)  // 'FAKE'
  }
}

// InvalidCurrencyError extends RangeError
const invalid = new InvalidCurrencyError('FAKE')
console.log('instanceof RangeError:', invalid instanceof RangeError)  // true
console.log('code:', invalid.code)   // 'FAKE'
console.log('name:', invalid.name)   // 'InvalidCurrencyError'

// Existing catch blocks still work — both classes extend built-in error types
try {
  money('1.00', 'NOTREAL')
} catch (e) {
  if (e instanceof RangeError) {
    console.log('caught as RangeError:', e.message)
  }
}`,
  name: 'Typed error classes',
};
