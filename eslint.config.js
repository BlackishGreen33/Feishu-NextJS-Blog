const nextVitals = require('eslint-config-next/core-web-vitals');
const simpleImportSort = require('eslint-plugin-simple-import-sort');

module.exports = [
  ...nextVitals,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['public/**/*.xml', 'public/robots.txt'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'no-console': 'warn',
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      'react/jsx-curly-brace-presence': [
        'warn',
        { props: 'never', children: 'never' },
      ],
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'simple-import-sort/exports': 'warn',
      'simple-import-sort/imports': [
        'warn',
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
];
