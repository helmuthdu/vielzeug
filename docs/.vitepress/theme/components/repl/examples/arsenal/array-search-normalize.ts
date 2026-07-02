export const arraySearchNormalizeExample = {
  code: `import { fuzzy, fuzzyScore } from '@vielzeug/arsenal'

// normalize: true — NFKD strips combining marks before comparison
const names = ['José', 'Élise', 'café', 'naïve', 'resume']

// Without normalize — accented chars don't match base form
const noNorm = fuzzy(names, 'jose', { threshold: 0.9 })
console.log('normalize:false (default):', noNorm) // []

// With normalize — 'jose' matches 'José'
const withNorm = fuzzy(names, 'jose', { normalize: true, threshold: 0.9 })
console.log('normalize:true:', withNorm) // ['José']

const cafeMatch = fuzzy(names, 'cafe', { normalize: true, threshold: 0.95 })
console.log('café vs cafe:', cafeMatch) // ['café']

// Scored mode with normalize
const scored = fuzzyScore(names, 'elise', { normalize: true, threshold: 0.5 })
console.log('Scored:', scored)`,
  name: 'fuzzy - Unicode normalization (normalize option)',
};
