export const schemaIntegrationExample = {
  code: `import { createForm } from '@vielzeug/forge'
import { customValidator } from '@vielzeug/forge/spell'
import { s } from '@vielzeug/spell'

const Profile = s.object({ email: s.string().email() })
const form = createForm({
  initialValues: { email: '' },
  validate: customValidator(Profile),
})

form.field('email').set('ada')
console.log(await form.validate())
console.log(form.field('email').error)`,
  name: 'Spell Schema Integration',
};
