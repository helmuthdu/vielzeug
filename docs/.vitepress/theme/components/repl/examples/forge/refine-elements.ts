export const refineElementsExample = {
  code: `import { createForm } from '@vielzeug/forge'
// Importing refine registers its ore-* custom elements and applies theme tokens.
// The REPL loads the bundle for every @vielzeug package your code imports,
// so this works from the forge tab without switching libraries.
import '@vielzeug/refine'

const form = createForm({ initialValues: { name: '', initiative: 7 } })

const host = document.createElement('div')
host.style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem; max-width: 320px'
host.innerHTML = \`
  <ore-input label="Player name"></ore-input>
  <ore-slider max="20" value="7">Initiative</ore-slider>
  <ore-button color="primary">Submit</ore-button>
  <output id="state"></output>
\`
document.body.append(host)

const nameInput = host.querySelector('ore-input')
const slider = host.querySelector('ore-slider')
const stateOut = host.querySelector('#state')

const render = () => {
  stateOut.textContent = JSON.stringify(form.value)
}
nameInput.addEventListener('input', () => form.field('name').set(nameInput.value))
slider.addEventListener('input', () => form.field('initiative').set(Number(slider.value)))
host.querySelector('ore-button').addEventListener('click', () => {
  console.log('submitted', form.value)
  render()
})
render()`,
  name: 'Forge state + Refine elements',
};
