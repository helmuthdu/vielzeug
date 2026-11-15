export const waitingExample = {
  code: `import { eventually, waitForEvent, waitUntil } from '@vielzeug/assay'

const box = document.createElement('div')
box.textContent = 'idle'
document.body.appendChild(box)

// Simulate async work that settles later.
setTimeout(() => { box.textContent = 'ready' }, 120)

// waitUntil polls until the predicate passes.
await waitUntil(() => box.textContent === 'ready')
console.log('waitUntil settled on:', box.textContent)

// eventually retries an assertion until it stops throwing.
setTimeout(() => { box.classList.add('done') }, 120)
await eventually(() => {
  if (!box.classList.contains('done')) throw new Error('not yet')
})
console.log('eventually saw .done:', box.classList.contains('done'))

// waitForEvent resolves with the next matching event.
setTimeout(() => { box.dispatchEvent(new CustomEvent('ping', { detail: 7 })) }, 120)
const ping = await waitForEvent(box, 'ping')
console.log('waitForEvent detail:', ping.detail)`,
  name: 'Cancellable Waiting',
};
