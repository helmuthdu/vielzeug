export const synthBasicExample = {
  code: `import { createBard } from '@vielzeug/bard'

const bard = createBard()

const panel = document.createElement('div')
panel.style.cssText = 'display:grid;gap:10px;max-width:340px;padding:20px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;font:14px system-ui;'
panel.textContent = 'No audio files involved — every sound below is generated:'
document.body.appendChild(panel)

function button(label, play) {
  const b = document.createElement('button')
  b.textContent = label
  b.addEventListener('click', () => {
    const handle = play()
    handle.finished.then(() => {
      out.textContent = label + ' finished'
    })
  })
  panel.appendChild(b)
  return b
}

button('UI tick', () => bard.synth({ type: 'square', freq: 1200, duration: 0.05, volume: 0.3 }))

button('Rising warning', () => bard.synth({ type: 'triangle', freq: [440, 880], duration: 0.3 }))

button('Error buzz', () =>
  bard.synth({
    type: 'sawtooth',
    freq: [220, 55],
    duration: 0.6,
    filter: { type: 'lowpass', frequency: [2400, 400], q: 2 },
  }),
)

button('Noise burst', () =>
  bard.synth({ type: 'noise', freq: 400, duration: 0.5, envelope: { attack: 0.01, decay: 0.4, sustain: 0 } }),
)

const out = document.createElement('output')
out.style.color = '#475569'
out.textContent = 'Click a button (browsers require a gesture to start audio)'
panel.appendChild(out)
`,
  name: 'synth() - Zero-Asset SFX',
};
