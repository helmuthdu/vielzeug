export const componentsExample = {
  code: `// The refine bundle registers every ore-* custom element as soon as it loads,
// so examples can build UI from markup directly. Theme tokens come from the
// same CSS the docs site uses, including dark mode.
const card = document.createElement('ore-card')
card.innerHTML = \`
  <h3 style="margin: 0 0 0.5rem">Session status</h3>
  <p style="margin: 0 0 1rem">
    <ore-badge color="success">Hunt phase</ore-badge>
    <ore-badge color="warning">2 clues left</ore-badge>
  </p>
  <ore-alert color="info" heading="Boss enraged">
    Crossfade to the boss theme when the clue counter hits zero.
  </ore-alert>
\`
document.body.append(card)

const group = document.createElement('ore-button-group')
group.style.marginTop = '1rem'
group.innerHTML = \`
  <ore-button color="primary">Start hunt</ore-button>
  <ore-button variant="outline">Pause</ore-button>
\`
document.body.append(group)

group.querySelector('ore-button')?.addEventListener('click', () => {
  console.log('hunt started — refine components are real custom elements')
})`,
  name: 'Themed components',
};
