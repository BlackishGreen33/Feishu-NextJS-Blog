const nextVitals = require('eslint-config-next/core-web-vitals');
const simpleImportSort = require('eslint-plugin-simple-import-sort');

const lineLimit = (max) => [
  'error',
  { max, skipBlankLines: true, skipComments: true },
];

module.exports = [
  { ignores: ['.scratch/**', 'output/**'] },
  ...nextVitals,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['public/**/*.xml', 'public/robots.txt'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'no-console': 'error',
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      'react/jsx-curly-brace-presence': [
        'error',
        { props: 'never', children: 'never' },
      ],
      'react-hooks/purity': 'error',
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/static-components': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^react$', '^next', '^@?\\w', '^\\u0000'],
            ['^.+\\.s?css$'],
            ['^@/'],
            [
              '^\\./?$',
              '^\\.(?!/?$)',
              '^\\.\\./?$',
              '^\\.\\.(?!/?$)',
              '^\\.\\./\\.\\./?$',
              '^\\.\\./\\.\\.(?!/?$)',
            ],
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}', 'scripts/**/*.{js,mjs,ts}'],
    ignores: [
      '**/*.d.ts',
      'src/common/constant/{clients,colors,devices,github,learn,stacks}.{ts,tsx}',
    ],
    rules: { 'max-lines': lineLimit(400) },
  },
  {
    files: [
      'src/__tests__/**',
      '**/*.test.{ts,tsx,js}',
      '**/*.spec.{ts,tsx,js}',
    ],
    rules: { 'max-lines': lineLimit(1000) },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { ignoreRestSiblings: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      'react-hooks/purity': 'error',
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/static-components': 'error',
    },
  },
  {
    files: [
      'src/server/**/*.ts',
      'src/pages/api/**/*.ts',
      'scripts/**/*.{js,mjs,ts}',
    ],
    rules: {
      'no-console': ['error', { allow: ['log', 'info', 'warn', 'error'] }],
    },
  },
];
