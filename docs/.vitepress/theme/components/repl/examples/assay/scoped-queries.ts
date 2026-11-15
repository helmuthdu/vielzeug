export const scopedQueriesExample = {
  code: `import { fireClick, fireInput, within } from '@vielzeug/assay'

// Build a small app DOM to probe (the REPL runs inside the sandbox iframe).
document.body.innerHTML = \`
  <form id="signup">
    <input data-testid="email" placeholder="email" />
    <button type="submit">Sign up</button>
    <p class="status" hidden></p>
  </form>\`

// within() keeps every lookup scoped to one root.
const view = within(document.getElementById('signup'))
const email = view.getByTestId('email')
const status = view.get('.status')

email.value = 'ada@example.com'
fireInput(email)

view.getByText('Sign up').addEventListener('click', () => {
  status.hidden = false
  status.textContent = 'Welcome, ' + email.value
})

fireClick(view.getByText('Sign up'))
console.log('status after click:', status.textContent)

// get* throws AssayQueryError when a required match is missing;
// query* returns null instead.
console.log('missing element:', view.query('.error'))
try {
  view.get('.error')
} catch (e) {
  console.log('get threw:', e.name)
}`,
  name: 'Scoped Queries And Events',
};
