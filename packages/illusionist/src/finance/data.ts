export const FINANCE_DATA = {
  banks: [
    'Deutsche Bank',
    'Commerzbank',
    'Sparkasse',
    'Barclays',
    'HSBC',
    'BNP Paribas',
    'Santander',
    'ING',
    'UniCredit',
    'UBS',
  ],
  creditCardIins: { amex: ['34', '37'], mastercard: ['51', '52', '53', '54', '55'], visa: ['4'] },
  ibanCountryCodes: { AT: 'AT', BE: 'BE', CH: 'CH', DE: 'DE', ES: 'ES', FR: 'FR', GB: 'GB', IT: 'IT', NL: 'NL' },
  ibanLengths: { AT: 20, BE: 16, CH: 21, DE: 22, ES: 24, FR: 27, GB: 22, IT: 27, NL: 18 },
  transactionTypes: ['payment', 'transfer', 'deposit', 'withdrawal', 'refund', 'fee'],
} as const;
