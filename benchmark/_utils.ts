const fn1 = () => {};
const fn2 = () => {};
function fn3() {}

export const listOfVariousTypes = [
  new Boolean(true),
  true,
  new String('foobarbaz'),
  'foo',
  1,
  new Number(1),
  fn1,
  fn2,
  fn3,
  undefined,
  null,
  Number.NaN,
  /foo/g,
  [1, 2, 3],
];

export const getListOfBooleans = (limit: number) =>
  Array(limit)
    .fill(null)
    .map(() => [Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5]);

export const getListOfNumbers = (limit: number) =>
  Array(limit)
    .fill(null)
    .map(() => Number(Math.floor(Math.random() * 1000)));

export const rangeOfNumbers = (limit: number) =>
  Array(limit)
    .fill(null)
    .map((_, i) => i);

export const getListOfStrings = (limit: number) =>
  Array(limit)
    .fill(null)
    .map(() => String(Math.floor(Math.random() * 1000)));

export const getListOfObjects = (limit: number) =>
  Array(limit)
    .fill(null)
    .map(() => ({
      bar: Number.NaN,
      baz: null,
      foo: String(Math.floor(Math.random() * 1000)),
      qux: [true],
    }));

export const getListOfLists = (limit: number) =>
  Array(limit)
    .fill(null)
    .map(() => [Number.NaN, null, String(Math.floor(Math.random() * 1000))]);
