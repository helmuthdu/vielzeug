export const arrayFilterExample = {
  code: "import { select } from '@vielzeug/toolkit'\n\nconst users = [\n  { name: 'Alice', age: 25, active: true },\n  { name: 'Bob', age: 30, active: false },\n  { name: 'Charlie', age: 35, active: true },\n  { name: 'David', age: 28, active: true }\n]\n\n// select as filter: identity callback + predicate\nconst activeUsers = select(users, u => u, u => u.active)\nconsole.log('Active users:', activeUsers)\n\nconst over30 = select(users, u => u, u => u.age > 30)\nconsole.log('Users over 30:', over30)\n\n// select as map+filter combined\nconst activeNames = select(users, u => u.name, u => u.active)\nconsole.log('Active user names:', activeNames)",
  name: 'select - Filter and map array elements',
};
