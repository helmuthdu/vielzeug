export const dropZoneValidateExample = {
  code: `import { createDropZone } from '@vielzeug/dnd'

const app = document.createElement('div')
app.style.cssText = 'display:flex;flex-direction:column;gap:12px;width:320px;'
document.body.appendChild(app)

const dropEl = document.createElement('div')
dropEl.style.cssText = 'height:160px;border:2px dashed #d1d5db;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:#fff;transition:all 120ms ease;'
app.appendChild(dropEl)

const statusEl = document.createElement('div')
statusEl.style.cssText = 'font-size:13px;color:#6b7280;min-height:20px;'
app.appendChild(statusEl)

const title = document.createElement('span')
title.style.cssText = 'font-size:14px;color:#374151;'
title.textContent = 'Drop images here'

const hint = document.createElement('small')
hint.style.cssText = 'font-size:12px;color:#9ca3af;'
hint.textContent = 'Max 2 MB each — async size check via onValidate'

dropEl.append(title, hint)

// Simulate async server-side quota check
const simulatedValidate = async (files) => {
  statusEl.textContent = 'Checking file size…'
  await new Promise(res => setTimeout(res, 600))
  const allUnder2MB = files.every(f => f.size < 2_097_152)
  return allUnder2MB
}

const zone = createDropZone({
  element: dropEl,
  accept: ['image/*'],
  onValidate: simulatedValidate,
  onDrop: (files) => {
    statusEl.textContent = ''
    console.log('Accepted:', files.map(f => \`\${f.name} (\${Math.round(f.size / 1024)}KB)\`).join(', '))
  },
  onDropRejected: (files) => {
    statusEl.textContent = ''
    console.log('Rejected:', files.map(f => f.name).join(', '))
  },
  onHoverChange: (hovered) => {
    dropEl.style.borderColor = hovered ? '#3b82f6' : '#d1d5db'
    dropEl.style.background = hovered ? '#eff6ff' : '#fff'
    title.textContent = hovered ? 'Release to drop!' : 'Drop images here'
  },
})

console.log('Drop zone with onValidate ready')
console.log('zone.validating starts false:', zone.validating)`,
  name: 'createDropZone - Async Validate',
};
