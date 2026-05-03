export const fieldOperationsExample = {
  code: "import { createForm } from '@vielzeug/formit'\n\nconst form = createForm({\n  defaultValues: {\n    name: 'Alice',\n    age: 25,\n  },\n})\n\nconsole.log('Initial:', form.values())\n\n// Set single field\nform.set('name', 'Bob')\nconsole.log('After set name:', form.get('name'))\n\n// Set multiple fields\nform.set('name', 'Charlie')\nform.set('age', 30)\nconsole.log('After setting both:', form.values())\n\n// Dirty tracking\nconsole.log('Is dirty:', form.isDirty)\nconsole.log('Field state:', form.field('name'))\n\n// Reset to initial\nform.reset()\nconsole.log('After reset:', form.values())",
  name: 'Field Operations - Get/Set/Patch',
};
