export const busesDuckingExample = {
  code: `import { createBard } from '@vielzeug/bard'

const bard = createBard({
  volume: 0.8,
  ducking: [{ source: 'voice', target: 'music', gain: 0.25, attack: 0.05, release: 0.4 }],
})

const panel = document.createElement('div')
panel.style.cssText = 'display:grid;gap:10px;max-width:360px;padding:20px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;font:14px system-ui;'
document.body.appendChild(panel)

const music = bard.bus('music')
const voice = bard.bus('voice')

const readout = document.createElement('output')
readout.style.cssText = 'font-family:ui-monospace,monospace;color:#334155;'
panel.appendChild(readout)

function render(label) {
  readout.textContent = label + ' | music duck level: ' + bard.bus('music').duckLevel.toFixed(2)
}

function button(label, fn) {
  const b = document.createElement('button')
  b.textContent = label
  b.addEventListener('click', fn)
  panel.appendChild(b)
}

// Two synth voices on different buses: the voice bus ducks the music bus while active.
button('Narrate (ducks music)', () => {
  const handle = bard.synth({ type: 'triangle', freq: 320, duration: 1.5, bus: 'voice' })
  render('voice active')
  handle.finished.then(() => render('voice ended'))
})

button('Music blip (no duck)', () => {
  bard.synth({ type: 'sine', freq: 220, duration: 1.5, bus: 'music' })
  render('music playing')
})

button('Mute music bus', () => {
  music.mute()
  render('music muted')
})

button('Unmute music bus', () => {
  music.unmute()
  render('music unmuted')
})

button('Music volume 40%', () => {
  music.setVolume(0.4, { fade: 0.3 })
  render('music volume ' + music.volume.toFixed(2))
})

render('ready')
`,
  name: 'bus() - Volume & Ducking',
};
