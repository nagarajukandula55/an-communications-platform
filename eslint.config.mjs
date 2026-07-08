import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/*.d.ts',
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.strictTypeChecked,

  {
    files: ['**/*.ts', '**/*.tsx'],

    languageOptions: {
      parser: tseslint.parser,

      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },

      globals: {
        ...globals.node,
      },
    },

    rules: {
      /**
       * Type Safety
       */

      '@typescript-eslint/no-explicit-any': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
        },
      ],

      '@typescript-eslint/consistent-type-definitions': [
        'error',
        'interface',
      ],

      '@typescript-eslint/no-floating-promises': 'error',

      '@typescript-eslint/await-thenable': 'error',

      '@typescript-eslint/no-misused-promises': 'error',

      /**
       * General JavaScript
       */

      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],

      eqeqeq: ['error', 'always'],

      curly: ['error', 'all'],

      'object-shorthand': ['error', 'always'],

      'prefer-const': 'error',

      /**
       * Imports
       */

      'sort-imports': [
        'off',
      ],
    },
  },

  eslintConfigPrettier,
];
