export const protocolErrorExample = {
  code: `import { FamiliarTimeoutError } from '@vielzeug/familiar'

const error = new FamiliarTimeoutError(500)
console.log(error.name)
console.log(error.timeoutMs)`,
  name: 'Familiar Error Contracts',
};
