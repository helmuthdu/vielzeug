export const reactiveVirtualizerExample = {
  code: `import { createReactiveVirtualizer } from '@vielzeug/scroll'

// createReactiveVirtualizer exposes state as a Signal<VirtualizerState> from
// @vielzeug/ripple instead of an onChange callback. In a real app you would
// read virt.state inside effect() — here we simulate that with a manual
// render() call on every scroll event so the demo has no extra imports.

const rows = Array.from({ length: 50_000 }, (_, i) => ({ id: i, label: 'Row ' + i }))

const scrollEl = document.createElement('div')
scrollEl.style.cssText = 'height:280px;overflow-y:auto;border:1px solid #e5e5e5;border-radius:4px;position:relative;'
document.body.appendChild(scrollEl)

const listEl = document.createElement('div')
listEl.style.cssText = 'position:absolute;top:0;left:0;right:0;'
scrollEl.appendChild(listEl)

const virt = createReactiveVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: 32,
})

function render() {
  const { items, totalSize } = virt.state.value
  listEl.style.height = totalSize + 'px'
  listEl.innerHTML = ''
  for (const item of items) {
    const el = document.createElement('div')
    el.style.cssText = \`position:absolute;top:\${item.start}px;left:0;right:0;height:32px;line-height:32px;padding:0 12px;border-bottom:1px solid #f0f0f0;\`
    el.textContent = rows[item.index].label
    listEl.appendChild(el)
  }
}

render()
scrollEl.addEventListener('scroll', render)

console.log('Reactive virtualizer wired to', rows.length, 'rows')
console.log('Live getter (not a snapshot):', virt.state.value.items.length, 'items visible')

// Standard virtualizer methods remain available directly on the returned object
virt.scrollToIndex(rows.length - 1, { align: 'end', behavior: 'smooth' })

// Cleanup
window.addEventListener('beforeunload', () => virt.dispose())`,
  name: 'Reactive Virtualizer',
};
