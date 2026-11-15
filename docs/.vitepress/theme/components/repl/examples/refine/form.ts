export const formExample = {
  code: `// Form controls are themeable custom elements with the same tokens as the
// docs site. Wire them up with plain DOM events.
const form = document.createElement('div')
form.style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem; max-width: 320px'
form.innerHTML = \`
  <ore-input label="Player name" placeholder="Ada Lovelace"></ore-input>
  <ore-checkbox-group label="Party roles">
    <ore-checkbox checked value="healer">Healer</ore-checkbox>
    <ore-checkbox value="scout">Scout</ore-checkbox>
  </ore-checkbox-group>
  <ore-slider max="20" value="7">Initiative</ore-slider>
  <ore-button color="primary">Roll initiative</ore-button>
\`
document.body.append(form)

const slider = form.querySelector('ore-slider')
form.querySelector('ore-button')?.addEventListener('click', () => {
  const name = form.querySelector('ore-input')?.value ?? '(anonymous)'
  console.log(name, 'rolls initiative', slider?.getAttribute('value'))
})`,
  name: 'Form controls',
};
