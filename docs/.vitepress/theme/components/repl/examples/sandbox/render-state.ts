export const renderStateExample = {
  code: `import { createSandbox } from '@vielzeug/sandbox'

// Push state in bulk, patch content incrementally, and hot-patch styles — all without a full re-render
const container = document.createElement('div')
document.body.appendChild(container)

const sandbox = createSandbox(container, {
  namedStyles: { theme: ':root { --accent: royalblue; }' },
})

const receivedUpdates = []
sandbox.onMessage((msg) => {
  if (msg.type === 'custom' && msg.event === 'state-received') receivedUpdates.push(msg.detail)
})

await sandbox.render(\`
  <script>
    document.addEventListener('sandbox:state-update', (e) => {
      window.__sandbox__.emit('state-received', { key: e.detail.key, value: e.detail.value })
    })
  </script>
  <div id="root">Loading…</div>
\`)

sandbox.setStateAll({ user: { name: 'Ada' }, theme: 'dark' }) // one postMessage for several values
sandbox.setState('locale', 'en-GB') // single value
sandbox.patch('<div id="root">Ready ✓</div>') // swap body, keep the listener
sandbox.updateStyle('theme', ':root { --accent: seagreen; }') // hot-patch CSS, no re-render

await new Promise((resolve) => setTimeout(resolve, 50)) // let the postMessage round-trips arrive
console.log('State updates received by host:', receivedUpdates)

sandbox.dispose()`,
  name: 'Bulk State + Patch + Style Hot-patch',
};
