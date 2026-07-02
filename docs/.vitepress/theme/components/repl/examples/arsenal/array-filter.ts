export const arrayFilterExample = {
  code: `import { filterMap } from '@vielzeug/arsenal'

const users = [
  { name: 'Alice', age: 25, active: true },
  { name: 'Bob', age: 30, active: false },
  { name: 'Charlie', age: 35, active: true },
  { name: 'David', age: 28, active: true }
]

const activeUsers = filterMap(users, user =>
  user.active ? user : undefined
)
console.log('Active users:', activeUsers)

const over30 = filterMap(users, user =>
  user.age > 30 ? user : undefined
)
console.log('Users over 30:', over30)

const activeNames = filterMap(users, user =>
  user.active ? user.name : undefined
)
console.log('Active user names:', activeNames)`,
  name: 'filterMap - Filter and map array elements',
};
