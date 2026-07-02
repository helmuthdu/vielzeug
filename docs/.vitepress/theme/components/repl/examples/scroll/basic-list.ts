export const basicListExample = {
  code: `import { createVirtualizer } from '@vielzeug/scroll'

const ITEM_COUNT = 100
const ROW_HEIGHT = 40

const container = document.createElement('div')
container.style.cssText = 'height:400px;overflow-y:auto;border:1px solid #e5e5e5;border-radius:4px;position:relative;margin:1rem;'
document.body.appendChild(container)

const spacer = document.createElement('div')
const content = document.createElement('div')
content.style.cssText = 'position:absolute;top:0;left:0;right:0;'
container.appendChild(spacer)
container.appendChild(content)

const virtualizer = createVirtualizer(container, {
  count: ITEM_COUNT,
  estimateSize: ROW_HEIGHT,
  onChange: ({ items, totalSize }) => {
    spacer.style.height = totalSize + 'px'
    content.innerHTML = ''
    items.forEach(({ index, start, size }) => {
      const row = document.createElement('div')
      row.style.cssText = \`position:absolute;top:\${start}px;left:0;right:0;height:\${size}px;display:flex;align-items:center;padding:0 16px;border-bottom:1px solid #f0f0f0;background:\${index % 2 ? '#fafafa' : '#fff'};\`
      row.textContent = \`Row #\${index + 1} of \${ITEM_COUNT}\`
      content.appendChild(row)
    })
  },
})

console.log(\`✓ Virtualizer created with \${ITEM_COUNT} rows\`)
console.log('Rendered DOM nodes:', virtualizer.items.length, '(out of', ITEM_COUNT, ')')`,
  name: 'Virtualizer - Basic List',
};
