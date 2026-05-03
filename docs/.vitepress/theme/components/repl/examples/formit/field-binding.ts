export const fieldBindingExample = {
  code: "import { createForm } from '@vielzeug/formit'\n\nconst form = createForm({\n  defaultValues: {\n    firstName: '',\n    lastName: '',\n    email: '',\n  },\n})\n\n// bind() returns live getters compatible with HTML inputs\nconst firstNameBind = form.bind('firstName')\nconst emailBind = form.bind('email')\n\nconsole.log('Binding for firstName:', {\n  name: firstNameBind.name,\n  value: firstNameBind.value,\n})\n\n// Simulate user input — call onChange with an Event-like object\nfirstNameBind.onChange({ target: { value: 'John' } })\nemailBind.onChange({ target: { value: 'john@example.com' } })\n\nconsole.log('Form values after input:', form.values())\nconsole.log('Touched fields:', form.isTouched)",
  name: 'Field Binding for Inputs',
};
