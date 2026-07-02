export const onRangeChangeExample = {
  code: `import { createVirtualizer } from '@vielzeug/scroll'

// Infinite scroll: detect when the user is near the bottom
// inside onChange and load more data.

const app = document.createElement('div')
app.style.cssText = 'font-family:system-ui,sans-serif;padding:16px;max-width:480px;'
document.body.appendChild(app)

const badge = document.createElement('div')
badge.style.cssText = 'background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:13px;color:#0369a1;'
badge.textContent = 'Scroll to the bottom — more items load automatically'
app.appendChild(badge)

const rangeEl = document.createElement('div')
rangeEl.style.cssText = 'font-size:12px;font-weight:600;color:#6b7280;margin-bottom:8px;'
rangeEl.textContent = 'Visible: —'
app.appendChild(rangeEl)

const container = document.createElement('div')
container.style.cssText = 'height:360px;overflow-y:auto;border:1px solid #e5e5e5;border-radius:6px;position:relative;'
app.appendChild(container)

const spacer = document.createElement('div')
const content = document.createElement('div')
content.style.cssText = 'position:absolute;top:0;left:0;right:0;'
container.appendChild(spacer)
container.appendChild(content)

let count = 50
let loading = false

const virt = createVirtualizer(container, {
  count,
  estimateSize: 44,
  onChange: ({ items, totalSize }) => {
    spacer.style.height = totalSize + 'px'
    content.innerHTML = ''
    items.forEach(({ index, start, size }) => {
      const row = document.createElement('div')
      row.style.cssText = \`position:absolute;top:\${start}px;left:0;right:0;height:\${size}px;display:flex;align-items:center;padding:0 14px;border-bottom:1px solid #f3f4f6;font-size:13px;\`
      row.textContent = \`Row \${index + 1} of \${count}\`
      content.appendChild(row)
    })
    const first = items[0]?.index ?? -1
    const last = items.at(-1)?.index ?? -1
    if (first >= 0) rangeEl.textContent = \`Visible: \${first} – \${last}\`
    if (!loading && last >= count - 10) {
      loading = true
      setTimeout(() => { count += 50; virt.update({ count }); loading = false }, 300)
    }
  },
})`,
  name: 'Infinite Scroll',
};
