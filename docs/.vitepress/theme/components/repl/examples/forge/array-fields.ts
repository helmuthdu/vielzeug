export const arrayFieldsExample = {
  code: "import { createForm } from '@vielzeug/forge'\n\nconst form = createForm({\n  defaultValues: {\n    tags: ['javascript', 'typescript'],\n  },\n})\n\nconsole.log('Initial tags:', form.get('tags'))\n\n// Append a new tag\nform.array('tags').append('react')\nconsole.log('After append:', form.get('tags'))\n\n// Remove second item (index 1)\nform.array('tags').remove(1)\nconsole.log('After remove index 1:', form.get('tags'))\n\n// Move first item to last position\nform.array('tags').move(0, 1)\nconsole.log('After move:', form.get('tags'))",
  name: 'Array Fields - Dynamic Lists',
};
