import path from 'node:path';
import nx from '@nx/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import baseConfig from '../../eslint.config.mjs';

const features = ['auth', 'loan-purposes', 'applications', 'admin'];
const sharedFolders = [
  'components',
  'hooks',
  'lib',
  'utils',
  'config',
  'testing',
];
const src = (...parts) => path.join('src', ...parts);

export default [
  ...nx.configs['flat/react'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
  },
  {
    // Bulletproof-react import rules: app -> features -> shared, never sideways.
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': {
        [path.join(import.meta.dirname, 'eslint-alias-resolver.cjs')]: {},
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx'] },
      },
    },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          basePath: import.meta.dirname,
          zones: [
            // A feature may not import another feature.
            ...features.map((feature) => ({
              target: src('features', feature),
              from: src('features'),
              except: [`./${feature}`],
              message:
                'Features cannot import from other features. Compose them in src/app.',
            })),
            // Features may not import from the app layer.
            {
              target: src('features'),
              from: src('app'),
              message: 'Features cannot import from the app layer.',
            },
            // Shared code may not import from features or the app layer.
            ...sharedFolders.map((folder) => ({
              target: src(folder),
              from: [src('features'), src('app')],
              message:
                'Shared code cannot depend on features or the app layer.',
            })),
          ],
        },
      ],
    },
  },
  {
    // Test helpers may wire up app-level providers.
    files: ['src/testing/**/*.ts', 'src/testing/**/*.tsx'],
    rules: { 'import/no-restricted-paths': 'off' },
  },
];
