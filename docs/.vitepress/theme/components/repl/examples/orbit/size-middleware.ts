export const sizeMiddlewareExample = {
  code: `import { float, offset, flip, size } from '@vielzeug/orbit'

const button = document.createElement('button')
button.textContent = 'Open dropdown'
button.style.cssText = 'margin:50px;padding:8px 16px;'
document.body.appendChild(button)

const dropdown = document.createElement('div')
dropdown.style.cssText = 'position:fixed;left:0;top:0;background:#fff;border:1px solid #e5e5e5;border-radius:6px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.1);'
// Populate dropdown with many items
for (let i = 1; i <= 20; i++) {
  const item = document.createElement('div')
  item.textContent = 'Option ' + i
  item.style.cssText = 'padding:8px 16px;cursor:pointer;'
  dropdown.appendChild(item)
}
document.body.appendChild(dropdown)

// size() writes availableHeight/availableWidth to middlewareData.size.
// Read it in the float() apply callback to constrain the floating element.
const handle = float(button, dropdown, {
  placement: 'bottom-start',
  middleware: [offset(4), flip(), size({ padding: 8 })],
  apply(result) {
    const sizeData = result.middlewareData.size
    if (sizeData) {
      dropdown.style.maxHeight = Math.min(sizeData.availableHeight, 300) + 'px'
      console.log('Available height:', sizeData.availableHeight)
    }
    dropdown.style.left = result.x + 'px'
    dropdown.style.top = result.y + 'px'
    console.log('Resolved placement:', result.placement)
  },
})

console.log('size() constrains dropdown height to available space')`,
  name: 'size() - Constrain Height',
};
