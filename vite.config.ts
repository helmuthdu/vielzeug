import { resolve } from 'node:path';
import dts from 'vite-plugin-dts';

type LibraryEntry = string | Record<string, string>;

export const getConfig = (
  __dirname: string,
  options?: {
    entry?: LibraryEntry;
    name?: string;
    preserveModules?: boolean;
    linkedDependencies?: string[];
  },
) => {
  // This function returns a Vite configuration object for building a library.
  const entry = options?.entry || resolve(__dirname, 'src/index.ts');
  const name = options?.name || 'Vielzeug';
  const preserveModules = options?.preserveModules ?? true;

  console.log(`|> Building library in ${__dirname}`);

  // biome-ignore lint/suspicious/noExplicitAny: -
  const config: any = {
    build: {
      lib: {
        entry,
        fileName: (format: string, entryName: string) => {
          if (entryName === 'src/index') {
            return `index.${format === 'es' ? 'js' : 'cjs'}`;
          }
          return `${entryName}.${format === 'es' ? 'js' : 'cjs'}`;
        },
        formats: ['es', 'cjs'],
        name,
      },
      rollupOptions: {
        output: {
          preserveModules,
          ...(preserveModules && { preserveModulesRoot: resolve(__dirname, 'src') }),
        },
      },
      sourcemap: true,
    },
    plugins: [dts({ include: [resolve(__dirname, 'src')], insertTypesEntry: true, rollupTypes: true })],
  };

  if (options?.linkedDependencies?.length){
    console.log(`|> Adding linked dependencies: ${options.linkedDependencies.join(', ')}`);
    config.optimizeDeps ||= {};
    config.optimizeDeps.include ||= [];
    config.build.commonjsOptions ||= {};
    config.build.commonjsOptions.include ||= [];
    for (const dep of options.linkedDependencies) {
      config.optimizeDeps.include.push(dep);
      config.build.commonjsOptions.include.push(dep);
    }
    config.build.commonjsOptions.include.push('node_modules');
  }

  return config;
};
