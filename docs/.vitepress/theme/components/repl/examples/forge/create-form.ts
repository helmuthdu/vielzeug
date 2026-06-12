export const createFormExample = {
  code: "import { createForm } from '@vielzeug/forge'\n\nconst form = createForm({\n  defaultValues: {\n    name: '',\n    email: '',\n    age: 0,\n  },\n})\n\nconsole.log('Form created!')\nconsole.log('Initial values:', form.values())\nconsole.log('Name:', form.get('name'))\nconsole.log('isDirty:', form.state.isDirty)\nconsole.log('isValid:', form.state.isValid)\nconsole.log('submitCount:', form.state.submitCount)",
  name: 'Create Form - Basic Setup',
};
