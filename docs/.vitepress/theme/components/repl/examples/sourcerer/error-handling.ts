export const errorHandlingExample = {
  code: `import { createPageSource } from '@vielzeug/sourcerer'

const source = createPageSource({
  load: async () => { throw new Error('network down') },
})

try {
  await source.reload()
} catch (error) {
  console.log((error as Error).message)
}

console.log(source.state.error?.message)
source.dispose()`,
  name: 'Error Handling',
};
