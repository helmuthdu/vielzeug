export const dropZoneBasicExample = {
  code: `import { createDropZone } from '@vielzeug/dnd'

const dropEl = document.createElement('div')
dropEl.id = 'drop-zone'
dropEl.style.cssText = 'width:300px;height:200px;border:2px dashed #ccc;display:flex;align-items:center;justify-content:center;cursor:pointer;'
dropEl.textContent = 'Drop files here'
document.body.appendChild(dropEl)

const zone = createDropZone({
  element: dropEl,
  onDrop: (files) => {
    console.log('Dropped', files.length, 'file(s):')
    files.forEach(f => console.log(\`  - \${f.name} (\${f.type}) - \${Math.round(f.size / 1024)}KB\`))
  },
  onHoverChange: (hovered) => {
    dropEl.style.borderColor = hovered ? '#3b82f6' : '#ccc'
    dropEl.style.background = hovered ? '#eff6ff' : ''
    dropEl.textContent = hovered ? 'Release to drop!' : 'Drop files here'
  },
})

console.log('Drop zone created and attached to #drop-zone')
console.log('API: zone.hovered =', zone.hovered)
console.log('Tip: Try dragging files over the drop zone element')`,
  name: 'createDropZone - Basic',
};
