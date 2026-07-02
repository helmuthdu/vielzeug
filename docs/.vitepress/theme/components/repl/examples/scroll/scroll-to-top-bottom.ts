export const scrollToTopBottomExample = {
  code: `import { createVirtualizer } from '@vielzeug/scroll'

const ITEM_COUNT = 500

const wrapper = document.createElement('div')
wrapper.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:1rem;'
document.body.appendChild(wrapper)

const btnRow = document.createElement('div')
btnRow.style.cssText = 'display:flex;gap:8px;'

const btnTop = document.createElement('button')
btnTop.textContent = '⬆ scrollToTop'
btnTop.style.cssText = 'padding:6px 12px;cursor:pointer;border:1px solid #ccc;border-radius:4px;'

const btnBottom = document.createElement('button')
btnBottom.textContent = '⬇ scrollToBottom'
btnBottom.style.cssText = 'padding:6px 12px;cursor:pointer;border:1px solid #ccc;border-radius:4px;'

btnRow.appendChild(btnTop)
btnRow.appendChild(btnBottom)
wrapper.appendChild(btnRow)

const container = document.createElement('div')
container.style.cssText = 'height:360px;overflow-y:auto;border:1px solid #e5e5e5;border-radius:4px;position:relative;'
wrapper.appendChild(container)

const spacer = document.createElement('div')
const content = document.createElement('div')
content.style.cssText = 'position:absolute;top:0;left:0;right:0;'
container.appendChild(spacer)
container.appendChild(content)

const virt = createVirtualizer(container, {
  count: ITEM_COUNT,
  estimateSize: 40,
  onChange: ({ items, totalSize }) => {
    spacer.style.height = totalSize + 'px'
    content.innerHTML = ''
    items.forEach(({ index, start, size }) => {
      const row = document.createElement('div')
      row.style.cssText = \`position:absolute;top:\${start}px;left:0;right:0;height:\${size}px;display:flex;align-items:center;padding:0 16px;border-bottom:1px solid #f0f0f0;background:\${index % 2 ? '#fafafa' : '#fff'};\`
      row.textContent = \`Row \${index + 1} / \${ITEM_COUNT}\`
      content.appendChild(row)
    })
  },
})

btnTop.addEventListener('click', () => {
  console.log('scrollToTop()')
  virt.scrollToTop({ behavior: 'smooth' })
})

btnBottom.addEventListener('click', () => {
  console.log('scrollToBottom()')
  virt.scrollToBottom({ behavior: 'smooth' })
})

console.log(\`✓ \${ITEM_COUNT} rows — use the buttons to jump to top or bottom\`)`,
  name: 'Virtualizer - scrollToTop / scrollToBottom',
};
