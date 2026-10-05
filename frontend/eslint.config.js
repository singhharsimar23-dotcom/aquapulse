import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // §8.6 ESLint rule: forbids numeric literals as JSX children in display components
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXElement > JSXExpressionContainer > Literal[value=/^[0-9]/]',
          message: 'Hardcoded numeric literals are forbidden in display JSX. Use <Num value prov /> or <Exempt reason> per §8.6.',
        },
      ],
    },
  }
);
