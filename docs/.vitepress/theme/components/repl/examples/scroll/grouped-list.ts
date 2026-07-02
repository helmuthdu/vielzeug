export const groupedListExample = {
  code: `import { createGroupedVirtualizer } from '@vielzeug/scroll'

// Grouped contact list with sticky section headers

type Contact = { id: number; name: string }

const sections = [
  { label: 'A', items: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Andrew' }] },
  { label: 'B', items: [{ id: 3, name: 'Bob' }, { id: 4, name: 'Brenda' }] },
  { label: 'C', items: [{ id: 5, name: 'Carol' }, { id: 6, name: 'Charlie' }, { id: 7, name: 'Chloe' }] },
  { label: 'D', items: [{ id: 8, name: 'David' }, { id: 9, name: 'Diana' }] },
]

const app = document.createElement('div')
app.style.cssText = 'font-family:system-ui,sans-serif;max-width:360px;margin:1rem;'
document.body.appendChild(app)

const label = document.createElement('div')
label.style.cssText = 'font-size:11px;font-weight:600;color:#6b7280;margin-bottom:6px;'
label.textContent = 'CONTACTS'
app.appendChild(label)

const container = document.createElement('div')
container.style.cssText = 'height:320px;overflow-y:auto;border:1px solid #e5e5e5;border-radius:8px;position:relative;background:#fff;'
app.appendChild(container)

const spacer = document.createElement('div')
const content = document.createElement('div')
content.style.cssText = 'position:absolute;top:0;left:0;right:0;'
container.appendChild(spacer)
container.appendChild(content)

// Sticky header overlay — floats above the list
const stickyEl = document.createElement('div')
stickyEl.style.cssText = 'position:sticky;top:0;z-index:1;background:#f9fafb;border-bottom:1px solid #e5e5e5;padding:0 14px;height:32px;line-height:32px;font-size:12px;font-weight:700;color:#374151;display:none;'
container.appendChild(stickyEl)

const virt = createGroupedVirtualizer<Contact>(container, {
  estimateHeaderSize: 32,
  estimateItemSize: 48,
  sections,
  onChange: ({ headers, items, stickyHeader, totalSize }) => {
    spacer.style.height = totalSize + 'px'
    content.innerHTML = ''
    headers.forEach(({ start, size, label: text }) => {
      const el = document.createElement('div')
      el.style.cssText = \`position:absolute;top:\${start}px;left:0;right:0;height:\${size}px;background:#f9fafb;border-bottom:1px solid #e5e5e5;padding:0 14px;line-height:\${size}px;font-size:12px;font-weight:700;color:#374151;\`
      el.textContent = text
      content.appendChild(el)
    })
    items.forEach(({ start, size, data }) => {
      const el = document.createElement('div')
      el.style.cssText = \`position:absolute;top:\${start}px;left:0;right:0;height:\${size}px;display:flex;align-items:center;padding:0 14px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;\`
      el.textContent = data.name
      content.appendChild(el)
    })
    if (stickyHeader) {
      stickyEl.textContent = stickyHeader.label
      stickyEl.style.display = 'block'
    } else {
      stickyEl.style.display = 'none'
    }
  },
})

console.log('Sections:', sections.length, '| Total items:', sections.reduce((n, s) => n + s.items.length, 0))
console.log('Flat item count:', virt.count)`,
  name: 'Grouped List with Sticky Headers',
};
