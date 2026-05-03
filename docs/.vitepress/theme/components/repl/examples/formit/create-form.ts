export const createFormExample = {
  code: "import { createForm } from '@vielzeug/formit'\n\nconst form = createForm({\n  defaultValues: {\n    name: '',\n    email: '',\n    age: 0,\n  },\n})\n\nconsole.log('Form created!')\nconsole.log('Initial values:', form.values())\nconsole.log('Name:', form.get('name'))\nconsole.log('Is valid:', form.isValid)\nconsole.log('Is dirty:', form.isDirty)",
  name: 'Create Form - Basic Setup',
};
