import { resolve } from 'node:path';
import dts from 'vite-plugin-dts';

type LibraryEntry = string | Record<string, string>;

export const getConfig = (
  __dirname: string,
  options?: {
    entry?: LibraryEntry;
    name?: string;
    preserveModules?: boolean;
  },
): any => {
  // This function returns a Vite configuration object for building a library.
  const entry = options?.entry || resolve(__dirname, 'src/index.ts');
  const name = options?.name || 'Vielzeug';
  const preserveModules = options?.preserveModules ?? true;

  console.log(`|> Building library in ${__dirname}`);

  return {
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
};
