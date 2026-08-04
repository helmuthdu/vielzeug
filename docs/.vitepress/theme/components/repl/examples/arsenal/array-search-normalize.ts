export const arraySearchNormalizeExample = {
  code: `import { fuzzyFilter, fuzzyScore } from '@vielzeug/arsenal/array'

const names = ['José', 'Élise', 'café', 'naïve', 'resume']

const noNorm = fuzzyFilter(names, 'jose', { threshold: 0.9 })
console.log('normalize:false:', noNorm)

const withNorm = fuzzyFilter(names, 'jose', { normalize: true, threshold: 0.9 })
console.log('normalize:true:', withNorm)

const scored = fuzzyScore(names, 'elise', { normalize: true, threshold: 0.5 })
console.log('Scored:', scored)`,
  name: 'fuzzyFilter - Unicode normalization',
};
