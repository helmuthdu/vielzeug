export const arrayUniqExample = {
  code: "import { uniq } from '@vielzeug/toolkit'\n\nconst numbers = [1, 2, 2, 3, 3, 3, 4, 5, 5]\nconsole.log('Unique numbers:', uniq(numbers))\n\nconst tags = ['javascript', 'react', 'vue', 'react', 'angular', 'vue']\nconsole.log('Unique tags:', uniq(tags))\n\n// Works with objects too (by reference)\nconst obj1 = { id: 1 }\nconst obj2 = { id: 2 }\nconst objects = [obj1, obj2, obj1, obj2]\nconsole.log('Unique objects:', uniq(objects))",
  name: 'uniq - Remove duplicates',
};
