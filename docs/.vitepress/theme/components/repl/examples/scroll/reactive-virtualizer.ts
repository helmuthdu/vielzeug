export const reactiveVirtualizerExample = {
  code: `import { effect, fromSubscribable } from '@vielzeug/ripple'
import { createVirtualizer } from '@vielzeug/scroll'

// Every virtualizer is a framework-neutral external store. Ripple can bridge
// it without Scroll depending on a reactive runtime.

const rows = Array.from({ length: 50_000 }, (_, i) => ({ id: i, label: 'Row ' + i }))

const scrollEl = document.createElement('div')
scrollEl.style.cssText = 'height:280px;overflow-y:auto;border:1px solid #e5e5e5;border-radius:4px;position:relative;'
document.body.appendChild(scrollEl)

const listEl = document.createElement('div')
listEl.style.cssText = 'position:absolute;top:0;left:0;right:0;'
scrollEl.appendChild(listEl)

function render({ items, totalSize }) {
  listEl.style.height = totalSize + 'px'
  listEl.replaceChildren()
  for (const item of items) {
    const el = document.createElement('div')
    el.style.cssText = \`position:absolute;top:\${item.start}px;left:0;right:0;height:32px;line-height:32px;padding:0 12px;border-bottom:1px solid #f0f0f0;\`
    el.textContent = rows[item.index].label
    listEl.appendChild(el)
  }
}

const virt = createVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: 32,
})
const state = fromSubscribable(virt, { signal: virt.disposalSignal })
const renderEffect = effect(() => render(state.value))

console.log('Reactive virtualizer wired to', rows.length, 'rows')

// Standard virtualizer methods remain available directly on the returned object
virt.scrollToIndex(rows.length - 1, { align: 'end', behavior: 'smooth' })

// Cleanup
window.addEventListener('beforeunload', () => {
  renderEffect.dispose()
  virt.dispose()
})`,
  name: 'Reactive Virtualizer',
};
