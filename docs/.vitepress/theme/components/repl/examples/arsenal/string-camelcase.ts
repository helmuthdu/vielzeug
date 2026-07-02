export const stringCamelcaseExample = {
  code: `import { camelCase, pascalCase, kebabCase, snakeCase } from '@vielzeug/arsenal'

const input = 'hello world example'

console.log('camelCase:', camelCase(input))
console.log('PascalCase:', pascalCase(input))
console.log('kebab-case:', kebabCase(input))
console.log('snake_case:', snakeCase(input))

// Different input formats
const formats = [
  'hello-world',
  'hello_world',
  'HelloWorld',
  'helloWorld'
]

formats.forEach(str => {
  console.log(\`"\${str}" → camelCase: \${camelCase(str)}\`)
})`,
  name: 'camelCase - Convert to camelCase',
};
