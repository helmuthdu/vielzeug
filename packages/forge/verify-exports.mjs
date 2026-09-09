import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const entries = ['index', 'dom', 'form-data', 'persist', 'schema'];

for (const entry of entries) {
  await import(`./dist/${entry}.js`);
  require(`./dist/${entry}.cjs`);
}

const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];
for (const forge of modules) {
  for (const [ErrorType, name, args] of [
    [forge.ForgeError, 'ForgeError', ['artifact']],
    [forge.ForgeConfigError, 'ForgeConfigError', ['artifact']],
    [forge.ForgeDisposedError, 'ForgeDisposedError', ['artifact']],
    [forge.ForgeSubmitError, 'ForgeSubmitError', ['artifact']],
    [forge.ForgeValidationError, 'ForgeValidationError', ['artifact']],
  ]) {
    const error = new ErrorType(...args);
    if (error.name !== name || !(error instanceof forge.ForgeError)) throw new Error(`${name} identity mismatch`);
  }

  const form = forge.createForm({ initialValues: { profile: { name: 'Ada' } } });
  form.field('profile').field('name').set('Grace');
  form.field('profile').field('name').set('Ada');
  if (form.field('profile').dirty) throw new Error('parent dirty state mismatch');
  form.dispose();
}
