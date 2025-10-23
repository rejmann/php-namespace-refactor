import eslintJS from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import eslintSimpleImportSort from 'eslint-plugin-simple-import-sort'
import eslintPluginImport from 'eslint-plugin-import';

export default [
  // Configurações recomendadas do ESLint
  eslintJS.configs.recommended,
  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'simple-import-sort': eslintSimpleImportSort,
      'import': eslintPluginImport,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        Buffer: 'readonly',
        suite: 'readonly',
        test: 'readonly',
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      // Regras personalizadas
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
        },
      ],
      curly: 'warn',
      eqeqeq: 'warn',
      'no-throw-literal': 'warn',
      semi: 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-warning-comments': 'error',
      'no-console': ['error', { allow: ['debug', 'error'] }],
      'no-unused-vars': 'off',
      quotes: ['error', 'single'],
      indent: ['error', 2],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/newline-after-import': 'warn',
    },
  },
];
