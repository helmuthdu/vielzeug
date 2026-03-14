import css from '@eslint/css';
import js from '@eslint/js';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import perfectionist from 'eslint-plugin-perfectionist';
import eslintConfigPrettier from 'eslint-plugin-prettier/recommended';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    extends: ['js/recommended'],
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: { globals: globals.browser },
    plugins: { js },
  },
  tseslint.configs.recommended,
  eslintConfigPrettier,
  { extends: ['json/recommended'], files: ['**/*.json'], language: 'json/json', plugins: { json } },
  { extends: ['json/recommended'], files: ['**/*.jsonc'], language: 'json/jsonc', plugins: { json } },
  { extends: ['json/recommended'], files: ['**/*.json5'], language: 'json/json5', plugins: { json } },
  { extends: ['markdown/recommended'], files: ['**/*.md'], language: 'markdown/commonmark', plugins: { markdown } },
  { extends: ['css/recommended'], files: ['**/*.css'], language: 'css/css', plugins: { css } },
  {
    plugins: {
      perfectionist,
    },
    rules: {
      'perfectionist/sort-imports': 'error',
      'perfectionist/sort-jsx-props': 'error',
      'perfectionist/sort-object-types': 'error',
      'perfectionist/sort-objects': 'error',
      'perfectionist/sort-switch-case': 'error',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['off', { argsIgnorePattern: '^_' }],
      'padding-line-between-statements': [
        'error',
        // After directives (like 'use-strict'), except between directives
        { blankLine: 'always', next: '*', prev: 'directive' },
        { blankLine: 'any', next: 'directive', prev: 'directive' },
        // After imports, except between imports
        { blankLine: 'always', next: '*', prev: 'import' },
        { blankLine: 'any', next: 'import', prev: 'import' },
        // Before and after every sequence of variable declarations
        { blankLine: 'always', next: ['const', 'let', 'var'], prev: '*' },
        { blankLine: 'always', next: '*', prev: ['const', 'let', 'var'] },
        { blankLine: 'any', next: ['const', 'let', 'var'], prev: ['const', 'let', 'var'] },
        // Before and after class declaration, if, while, switch, try
        { blankLine: 'always', next: ['class', 'if', 'while', 'switch', 'try'], prev: '*' },
        { blankLine: 'always', next: '*', prev: ['class', 'if', 'while', 'switch', 'try'] },
        // Before return statements
        { blankLine: 'always', next: 'return', prev: '*' },
      ],
    },
  },
]);
