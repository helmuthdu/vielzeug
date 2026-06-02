export const stringCamelcaseExample = {
  code: "import { camelCase, pascalCase, kebabCase, snakeCase } from '@vielzeug/arsenal'\n\nconst input = 'hello world example'\n\nconsole.log('camelCase:', camelCase(input))\nconsole.log('PascalCase:', pascalCase(input))\nconsole.log('kebab-case:', kebabCase(input))\nconsole.log('snake_case:', snakeCase(input))\n\n// Different input formats\nconst formats = [\n  'hello-world',\n  'hello_world',\n  'HelloWorld',\n  'helloWorld'\n]\n\nformats.forEach(str => {\n  console.log(`\"${str}\" → camelCase: ${camelCase(str)}`)\n})",
  name: 'camelCase - Convert to camelCase',
};
