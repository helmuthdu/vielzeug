import { resolve } from 'node:path';
import type { UserConfig } from 'vite';
import dts from 'vite-plugin-dts';

export const getConfig = (__dirname: string) => {
  // This function returns a Vite configuration object for building a library.
  console.log(`|> Building library in ${__dirname}`);
  return {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        fileName: (format: string, entryName: string) => {
          if (entryName === 'src/index') {
            return `index.${format === 'es' ? 'js' : 'cjs'}`;
          }
          return `${entryName}.${format === 'es' ? 'js' : 'cjs'}`;
        },
        formats: ['es', 'cjs'],
        name: 'Vielzeug',
      },
      rollupOptions: {
        output: {
          preserveModules: true,
          preserveModulesRoot: resolve(__dirname, 'src'),
        },
      },
      sourcemap: true,
    },
    plugins: [dts({ include: [resolve(__dirname, 'src')], insertTypesEntry: true, rollupTypes: true })],
  } as UserConfig;
};
