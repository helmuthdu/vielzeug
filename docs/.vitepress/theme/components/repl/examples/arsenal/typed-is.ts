export const typedIsExample = {
  code: "import {\n  isString, isNumber, isBoolean, isArray, isObject,\n  isFunction, isDate, isRegex, isNil, isEmpty\n} from '@vielzeug/arsenal'\n\nconst values = [\n  'hello', 42, true, [], {}, null, undefined,\n  () => {}, new Date(), /test/\n]\n\nvalues.forEach(val => {\n  console.log(`Value: ${val}`)\n  console.log(`  String: ${isString(val)}`)\n  console.log(`  Number: ${isNumber(val)}`)\n  console.log(`  Nil: ${isNil(val)}`)\n  console.log(`  Empty: ${isEmpty(val)}`)\n  console.log('---')\n})",
  name: 'Type checking utilities',
};
