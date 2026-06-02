export const functionCurryExample = {
  code: "import { curry } from '@vielzeug/arsenal'\n\nconst add = (a, b, c) => a + b + c\n\nconst curriedAdd = curry(add)\n\nconsole.log('All at once:', curriedAdd(1, 2, 3))\nconsole.log('One by one:', curriedAdd(1)(2)(3))\nconsole.log('Partially:', curriedAdd(1, 2)(3))\n\n// Practical use case\nconst greet = curry((greeting, name, punctuation) =>\n  `${greeting}, ${name}${punctuation}`\n)\n\nconst sayHello = greet('Hello')\nconst sayHelloToUser = sayHello('User')\n\nconsole.log(sayHelloToUser('!'))\nconsole.log(sayHelloToUser('.'))",
  name: 'curry - Curry functions',
};
