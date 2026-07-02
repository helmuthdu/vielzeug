export const arrayUniqExample = {
  code: `import { uniq } from '@vielzeug/arsenal'

const numbers = [1, 2, 2, 3, 3, 3, 4, 5, 5]
console.log('Unique numbers:', uniq(numbers))

const tags = ['javascript', 'react', 'vue', 'react', 'angular', 'vue']
console.log('Unique tags:', uniq(tags))

// Works with objects too (by reference)
const obj1 = { id: 1 }
const obj2 = { id: 2 }
const objects = [obj1, obj2, obj1, obj2]
console.log('Unique objects:', uniq(objects))`,
  name: 'uniq - Remove duplicates',
};
