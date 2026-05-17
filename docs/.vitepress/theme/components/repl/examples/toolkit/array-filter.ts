export const arrayFilterExample = {
  code: "import { filterMap } from '@vielzeug/toolkit'\n\nconst users = [\n  { name: 'Alice', age: 25, active: true },\n  { name: 'Bob', age: 30, active: false },\n  { name: 'Charlie', age: 35, active: true },\n  { name: 'David', age: 28, active: true }\n]\n\nconst activeUsers = filterMap(users, user =>\n  user.active ? user : undefined\n)\nconsole.log('Active users:', activeUsers)\n\nconst over30 = filterMap(users, user =>\n  user.age > 30 ? user : undefined\n)\nconsole.log('Users over 30:', over30)\n\nconst activeNames = filterMap(users, user =>\n  user.active ? user.name : undefined\n)\nconsole.log('Active user names:', activeNames)",
  name: 'filterMap - Filter and map array elements',
};
