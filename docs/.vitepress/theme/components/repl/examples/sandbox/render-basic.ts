export const renderBasicExample = {
  code: `import { createSandbox } from '@vielzeug/sandbox'

// Render untrusted HTML into an isolated iframe and listen for lifecycle messages
const container = document.createElement('div')
container.style.cssText = 'border:1px solid #e5e5e5;border-radius:4px;min-height:80px;'
document.body.appendChild(container)

const sandbox = createSandbox(container, {
  title: 'Live Preview',
  lang: 'en',
})

sandbox.onMessage((msg) => {
  if (msg.type === 'resize') console.log('Resized to', msg.height, 'px')
  if (msg.type === 'error') console.error('[sandbox error]', msg.message)
  if (msg.type === 'custom') console.log('Custom event:', msg.event, msg.detail)
})

await sandbox.render('<h1>Hello from the sandbox</h1><p>This content runs in an isolated iframe.</p>')
console.log('Sandbox rendered — ready resolved')

sandbox.dispose()
console.log('Disposed — disposalSignal aborted?', sandbox.disposalSignal.aborted)`,
  name: 'Render into an Iframe',
};
