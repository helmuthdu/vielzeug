export const objectMergeExample = {
  code: `import { deepMerge, shallowMerge } from '@vielzeug/arsenal'

const obj1 = { a: 1, b: { c: 2 }, d: [1, 2] }
const obj2 = { b: { d: 3 }, e: 4, d: [3, 4] }
const obj3 = { a: 10, f: 5 }

const deeplyMerged = deepMerge(obj1, obj2, obj3)
console.log('Deep merge:', deeplyMerged)

const shallowlyMerged = shallowMerge(obj1, obj2, obj3)
console.log('Shallow merge:', shallowlyMerged)

const config1 = {
  api: { baseUrl: 'https://api.dev', timeout: 5000 },
  features: { darkMode: true },
}
const config2 = {
  api: { timeout: 10000, retries: 3 },
  features: { notifications: true },
}

console.log('Merged configs:', deepMerge(config1, config2))`,
  name: 'deepMerge - Merge objects',
};
