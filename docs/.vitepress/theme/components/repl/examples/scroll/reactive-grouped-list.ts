export const reactiveGroupedListExample = {
  code: `import { createReactiveGroupedVirtualizer } from '@vielzeug/scroll'

// Reactive grouped virtualizer — state exposed as a Signal
// Useful for frameworks/systems built on @vielzeug/ripple

type Contact = { id: number; name: string }

const sections = [
  { label: 'A', items: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Andrew' }] },
  { label: 'B', items: [{ id: 3, name: 'Bob' }, { id: 4, name: 'Brenda' }] },
  { label: 'C', items: [{ id: 5, name: 'Carol' }, { id: 6, name: 'Charlie' }] },
]

const app = document.createElement('div')
app.style.cssText = 'font-family:system-ui,sans-serif;max-width:360px;margin:1rem;'
document.body.appendChild(app)

const container = document.createElement('div')
container.style.cssText = 'height:280px;overflow-y:auto;border:1px solid #e5e5e5;border-radius:8px;position:relative;background:#fff;'
app.appendChild(container)

const spacer = document.createElement('div')
const content = document.createElement('div')
content.style.cssText = 'position:absolute;top:0;left:0;right:0;'
container.appendChild(spacer)
container.appendChild(content)

const stickyEl = document.createElement('div')
stickyEl.style.cssText = 'position:sticky;top:0;z-index:1;background:#f9fafb;border-bottom:1px solid #e5e5e5;padding:0 14px;height:32px;line-height:32px;font-size:12px;font-weight:700;color:#374151;display:none;'
container.appendChild(stickyEl)

const virt = createReactiveGroupedVirtualizer<Contact>(container, {
  estimateHeaderSize: 32,
  estimateItemSize: 44,
  sections,
})

// virt.state is a Signal<GroupVirtualizerState<Contact>>
// In a reactive system, subscribe to it via effect().
// Here we simulate with a manual render triggered by state reads.
function render() {
  const { headers, items, stickyHeader, totalSize } = virt.state.value
  spacer.style.height = totalSize + 'px'
  content.innerHTML = ''
  headers.forEach(({ start, size, label: text }) => {
    const el = document.createElement('div')
    el.style.cssText = \`position:absolute;top:\${start}px;height:\${size}px;left:0;right:0;background:#f9fafb;border-bottom:1px solid #e5e5e5;padding:0 14px;line-height:\${size}px;font-size:12px;font-weight:700;color:#374151;\`
    el.textContent = text
    content.appendChild(el)
  })
  items.forEach(({ start, size, data }) => {
    const el = document.createElement('div')
    el.style.cssText = \`position:absolute;top:\${start}px;height:\${size}px;left:0;right:0;padding:0 14px 0 22px;line-height:\${size}px;font-size:14px;color:#111827;border-bottom:1px solid #f3f4f6;\`
    el.textContent = data.name
    content.appendChild(el)
  })
  if (stickyHeader) {
    stickyEl.style.display = 'block'
    stickyEl.textContent = stickyHeader.label
  } else {
    stickyEl.style.display = 'none'
  }
}

// Initial render from signal value
render()
container.addEventListener('scroll', render)

// --- Live update demo ---
const btn = document.createElement('button')
btn.textContent = 'Add section D'
btn.style.cssText = 'margin-top:10px;padding:6px 14px;font-size:13px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;background:#fff;'
btn.onclick = () => {
  virt.update([
    ...sections,
    { label: 'D', items: [{ id: 8, name: 'David' }, { id: 9, name: 'Diana' }] },
  ])
  render()
  btn.disabled = true
  btn.style.opacity = '0.5'
}
app.appendChild(btn)

// Cleanup
window.addEventListener('beforeunload', () => virt.dispose())`,
  name: 'Reactive Grouped Virtualizer',
};
