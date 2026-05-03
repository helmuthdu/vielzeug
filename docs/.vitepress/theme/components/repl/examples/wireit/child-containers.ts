export const childContainersExample = {
  code: `import { createContainer, createToken } from '@vielzeug/wireit'

const Token = createToken('Value')
const root = createContainer().value(Token, 'root-value')

const child = root.createChild()
console.log('Root:', await root.resolve(Token))
console.log('Child inherits:', await child.resolve(Token))

child.value(Token, 'child-value', { overwrite: true })
console.log('Child override:', await child.resolve(Token))
console.log('Root unchanged:', await root.resolve(Token))`,
  name: 'Child Containers',
};
