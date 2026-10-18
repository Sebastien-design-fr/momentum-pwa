import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'shortcuts/**'] },
  js.configs.recommended,
  {
    files: ['*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        MomentumStore: 'readonly',
        MomentumSuggestions: 'readonly',
        MomentumPlanner: 'readonly',
        MomentumCoach: 'readonly',
        MomentumBridge: 'readonly',
        module: 'readonly',
      },
    },
  },
  { files: ['ai-runtime.js', 'ai-worker.js'], languageOptions: { sourceType: 'module' } },
  { files: ['tests/**/*.cjs'], languageOptions: { sourceType: 'commonjs', globals: globals.node } },
  { files: ['scripts/**/*.mjs'], languageOptions: { globals: globals.node } },
];
