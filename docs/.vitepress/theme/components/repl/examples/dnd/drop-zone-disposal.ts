export const dropZoneDisposalExample = {
  code: `import { createDropZone } from '@vielzeug/dnd'

const dropEl = document.createElement('div')
dropEl.style.cssText = 'width:300px;height:150px;border:2px dashed #ccc;display:flex;align-items:center;justify-content:center;'
dropEl.textContent = 'Drop files here'
document.body.appendChild(dropEl)

const zone = createDropZone({
  element: dropEl,
  onDrop: (files) => console.log('Dropped:', files.map(f => f.name)),
  onHoverChange: (hovered) => {
    dropEl.style.borderColor = hovered ? '#3b82f6' : '#ccc'
  },
})

console.log('zone.disposed:', zone.disposed)          // false
console.log('zone.disposalSignal.aborted:', zone.disposalSignal.aborted) // false

// Use disposalSignal to cancel an in-flight request when the zone is torn down
const signal = zone.disposalSignal
signal.addEventListener('abort', () => {
  console.log('disposalSignal fired — zone was disposed')
})

// Dispose after 2 seconds to demonstrate
setTimeout(() => {
  zone.dispose()
  console.log('zone.disposed:', zone.disposed)          // true
  console.log('zone.disposalSignal.aborted:', zone.disposalSignal.aborted) // true

  // dispose() is idempotent — calling it again is safe
  zone.dispose()
  console.log('Second dispose() call did not throw')
}, 2000)`,
  name: 'DropZone — disposed & disposalSignal',
};
