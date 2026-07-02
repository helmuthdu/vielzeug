export const dropZoneAcceptExample = {
  code: `import { createDropZone } from '@vielzeug/dnd'

const app = document.createElement('div')
app.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:flex-start;'
document.body.appendChild(app)

const button = document.createElement('button')
button.type = 'button'
button.style.cssText = 'padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;font:inherit;'
app.appendChild(button)

const dropEl = document.createElement('div')
dropEl.style.cssText = 'width:300px;height:200px;border:2px dashed #ccc;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:#fff;transition:border-color 120ms ease, background 120ms ease, opacity 120ms ease;'
app.appendChild(dropEl)

const title = document.createElement('span')
const hint = document.createElement('small')
hint.style.color = '#666'
dropEl.append(title, hint)

const options = {
  element: dropEl,
  accept: ['image/*', '.pdf'],
  disabled: false,
  onDrop: (files) => {
    console.log('Accepted files:')
    files.forEach(f => console.log(' ✓', f.name))
  },
  onDropRejected: (files) => {
    console.log('Rejected files (wrong type):')
    files.forEach(f => console.log(' ✗', f.name, '-', f.type || 'unknown'))
  },
  onHoverChange: (hovered) => {
    render(hovered)
  },
}

const zone = createDropZone(options)

const render = (hovered = false) => {
  button.textContent = options.disabled ? 'Enable drop zone' : 'Disable drop zone'
  title.textContent = options.disabled ? 'Drop zone disabled' : hovered ? 'Release to drop files' : 'Drop images or PDFs here'
  hint.textContent = options.disabled ? 'Drops are ignored while disabled' : 'Accepted: image/* and .pdf'
  dropEl.style.opacity = options.disabled ? '0.6' : '1'
  dropEl.style.borderColor = options.disabled ? '#94a3b8' : hovered ? '#10b981' : '#ccc'
  dropEl.style.background = !options.disabled && hovered ? '#ecfdf5' : '#fff'
}

button.addEventListener('click', () => {
  options.disabled = !options.disabled
  render()
  console.log('Disabled:', options.disabled)
})

render()
console.log('Drop zone ready. Current hover state:', zone.hovered)`,
  name: 'createDropZone - Accept Filter',
};
