export const fieldOperationsExample = {
  code: "import { createForm } from '@vielzeug/formit'\n\nconst form = createForm({\n  defaultValues: {\n    name: 'Alice',\n    age: 25,\n  },\n})\n\nconsole.log('Initial:', form.values())\n\nform.set('name', 'Bob')\nconsole.log('After set name:', form.get('name'))\n\nform.batch(() => {\n  form.set('name', 'Charlie')\n  form.set('age', 30)\n})\nconsole.log('After batch:', form.values())\nconsole.log('Field state:', form.field('name'))\nconsole.log('Form state:', form.state)\n\nform.reset()\nconsole.log('After reset:', form.values())",
  name: 'Field Operations - Get, Set, Batch, Reset',
};
