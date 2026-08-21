export const viewportBasicExample = {
  code: `import { createViewport } from '@vielzeug/sentinel'

const viewport = createViewport()
const logViewport = () => {
  const { dpr, height, width } = viewport.value
  console.log(\`\${width}x\${height} at \${dpr}dpr\`)
}

logViewport()
const unsubscribe = viewport.subscribe(logViewport)
window.dispatchEvent(new Event('resize'))

unsubscribe()
viewport.dispose()
console.log('disposed:', viewport.disposed)`,
  name: 'createViewport - Basic',
};
