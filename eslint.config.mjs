import eslintJS from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import eslintPluginImport from 'eslint-plugin-import';

export default [
  // Configurações recomendadas do ESLint
  eslintJS.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        __dirname: 'readonly',
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
        console: 'readonly',
      },
    },
  },
  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': typescriptEslint,
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
      'sort-imports': [
        'error',
        {
          ignoreCase: true,
          ignoreDeclarationSort: false,
          ignoreMemberSort: false,
          memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
          allowSeparatedGroups: false,
        },
      ],
    },
  },
];
